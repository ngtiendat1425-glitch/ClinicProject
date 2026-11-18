package vn.antam.clinic;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;

@Service
public class FileService {
    public static final int MAX_BYTES = 3 * 1024 * 1024;
    private static final int MAX_FILES_PER_ACCOUNT = 40;
    private static final Logger log = LoggerFactory.getLogger(FileService.class);
    private final JdbcTemplate jdbc;
    private final Path root;

    public FileService(JdbcTemplate jdbc, @Value("${clinic.uploads-path:./uploads}") String uploadsPath) {
        this.jdbc = jdbc;
        try {
            Path requested = Path.of(uploadsPath).toAbsolutePath().normalize();
            Files.createDirectories(requested);
            this.root = requested.toRealPath();
        } catch (IOException error) { throw new IllegalStateException("Cannot initialize private record storage"); }
    }

    @Transactional
    public Map<String,Object> upload(String accountId, Map<String,Object> body) {
        String name = Inputs.text(body, "name", 1, 180);
        String mime = Inputs.text(body, "mimeType", 1, 80);
        Object encoded = body.get("dataBase64");
        if (!(encoded instanceof String base64) || base64.isEmpty() || base64.length() > 4 * ((MAX_BYTES + 2) / 3)) throw new ApiException(413, "Tệp tải lên cần có dung lượng không quá 3 MB.");
        byte[] bytes;
        try { bytes = Base64.getDecoder().decode(base64); }
        catch (IllegalArgumentException error) { throw ApiException.bad("Dữ liệu tệp base64 không hợp lệ."); }
        return store(accountId, name, mime, bytes);
    }

    @Transactional
    public Map<String,Object> uploadMultipart(String accountId, MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_BYTES) throw new ApiException(413, "Tệp tải lên cần có dung lượng lớn hơn 0 và không quá 3 MB.");
        try { return store(accountId, file.getOriginalFilename(), file.getContentType(), file.getBytes()); }
        catch (IOException error) { throw ApiException.bad("Không đọc được tệp tải lên."); }
    }

    private Map<String,Object> store(String accountId, String name, String mime, byte[] bytes) {
        validateFile(name, mime, bytes);
        lockAccount(accountId);
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM record_files WHERE account_id=?", Integer.class, accountId);
        if (count != null && count >= MAX_FILES_PER_ACCOUNT) throw new ApiException(409, "Đã đạt giới hạn tệp trong hồ sơ. Vui lòng xóa các bản lưu không còn cần dùng.");
        String id = UUID.randomUUID().toString();
        String extension = mime.equals("application/pdf") ? "pdf" : mime.equals("image/png") ? "png" : "jpg";
        Path target = ownedPath(id + "." + extension);
        try { Files.write(target, bytes, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE); }
        catch (IOException error) { throw new ApiException(503, "Chưa lưu được tệp. Vui lòng thử lại sau."); }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) { if (status != STATUS_COMMITTED) deleteDisk(target); }
        });
        jdbc.update("INSERT INTO record_files(id,account_id,original_name,mime_type,size_bytes,disk_name,sha256,created_at) VALUES(?,?,?,?,?,?,?,?)",
            id, accountId, name, mime, bytes.length, target.getFileName().toString(), digest(bytes), Instant.now().toString());
        return Map.of("id", id, "name", name, "mimeType", mime, "size", bytes.length, "uri", "/files/" + id);
    }

    public static void validateFile(String name, String mime, byte[] bytes) {
        if (name == null || name.isBlank() || name.length() > 180 || name.matches(".*[\\\\/\\p{Cntrl}].*")) throw ApiException.bad("Tên tệp không hợp lệ.");
        if (mime == null || !Set.of("application/pdf", "image/jpeg", "image/png").contains(mime)) throw ApiException.bad("Chỉ chấp nhận tệp PDF, JPEG hoặc PNG.");
        if (bytes == null || bytes.length == 0 || bytes.length > MAX_BYTES) throw new ApiException(413, "Tệp tải lên cần có dung lượng lớn hơn 0 và không quá 3 MB.");
        String lower = name.toLowerCase(Locale.ROOT);
        boolean extension = mime.equals("application/pdf") ? lower.endsWith(".pdf") : mime.equals("image/png") ? lower.endsWith(".png") : lower.endsWith(".jpg") || lower.endsWith(".jpeg");
        if (!extension || !matchesSignature(bytes, mime)) throw ApiException.bad("Nội dung tệp không khớp định dạng PDF, JPEG hoặc PNG.");
    }

    public static boolean matchesSignature(byte[] bytes, String mime) {
        byte[] expected = switch (mime) {
            case "application/pdf" -> new byte[]{37,80,68,70,45};
            case "image/jpeg" -> new byte[]{(byte)255,(byte)216,(byte)255};
            case "image/png" -> new byte[]{(byte)137,80,78,71,13,10,26,10};
            default -> new byte[0];
        };
        if (expected.length == 0 || bytes.length < expected.length) return false;
        for (int index = 0; index < expected.length; index++) if (bytes[index] != expected[index]) return false;
        return true;
    }

    /** Return trusted server metadata; client-supplied URI/name/size are never authoritative. */
    public Map<String,Object> trustedAttachment(String accountId, Object candidate) {
        if (!(candidate instanceof Map<?,?> input) || !(input.get("id") instanceof String id)) throw ApiException.bad("Tệp đính kèm cần là tệp đã tải lên hồ sơ của bạn.");
        return ownedFile(accountId, id, false).publicValue();
    }

    @Transactional(readOnly = true)
    public Download download(String accountId, String id) {
        StoredFile file = ownedFile(accountId, id, false);
        Path path = ownedPath(file.diskName());
        try {
            if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS) || Files.size(path) != file.size()) throw ApiException.missing();
            byte[] bytes = Files.readAllBytes(path);
            if (!digest(bytes).equals(file.sha256()) || !matchesSignature(bytes, file.mime())) throw new ApiException(503, "Tệp lưu trữ cần được kiểm tra lại. Vui lòng liên hệ phòng khám.");
            return new Download(file.name(), file.mime(), bytes);
        } catch (IOException error) { throw ApiException.missing(); }
    }

    /** Called from a record transaction after its account row has been locked. */
    public Map<String,Object> replaceRecordAttachment(String accountId, String recordType, String recordId, Object candidate) {
        Map<String,Object> next = candidate == null ? null : trustedAttachment(accountId, candidate);
        String nextId = next == null ? null : (String) next.get("id");
        if (nextId != null) {
            ownedFile(accountId, nextId, true);
            List<Map<String,Object>> links = jdbc.queryForList("SELECT record_type,record_id FROM record_file_links WHERE file_id=?", nextId);
            if (!links.isEmpty() && (!recordType.equals(links.getFirst().get("record_type")) || !recordId.equals(links.getFirst().get("record_id")))) throw new ApiException(409, "Tệp này đã được dùng trong một bản lưu khác. Vui lòng tải một bản sao mới.");
        }
        List<String> previous = jdbc.query("SELECT file_id FROM record_file_links WHERE account_id=? AND record_type=? AND record_id=?", (row,index) -> row.getString(1), accountId, recordType, recordId);
        for (String previousId : previous) if (!previousId.equals(nextId)) {
            jdbc.update("DELETE FROM record_file_links WHERE file_id=? AND account_id=?", previousId, accountId);
            retire(accountId, previousId);
        }
        if (nextId != null && !previous.contains(nextId)) jdbc.update("INSERT INTO record_file_links(file_id,account_id,record_type,record_id) VALUES(?,?,?,?)", nextId, accountId, recordType, recordId);
        return next;
    }

    @Transactional
    public void deleteOrphan(String accountId, String id) {
        lockAccount(accountId);
        ownedFile(accountId, id, true);
        Integer links = jdbc.queryForObject("SELECT COUNT(*) FROM record_file_links WHERE file_id=?", Integer.class, id);
        if (links != null && links > 0) throw new ApiException(409, "Tệp đang được dùng trong hồ sơ. Hãy xóa bản lưu tương ứng trước.");
        retire(accountId, id);
    }

    private void retire(String accountId, String id) {
        StoredFile file = ownedFile(accountId, id, true);
        jdbc.update("DELETE FROM record_files WHERE id=? AND account_id=?", id, accountId);
        Path target = ownedPath(file.diskName());
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { deleteDisk(target); }
        });
    }

    void lockAccount(String accountId) {
        if (jdbc.query("SELECT id FROM patient_accounts WHERE id=? FOR UPDATE", (row,index) -> row.getString(1), accountId).isEmpty()) throw ApiException.missing();
    }

    private StoredFile ownedFile(String accountId, String id, boolean lock) {
        if (id == null || !id.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")) throw ApiException.missing();
        return jdbc.query("SELECT id,original_name,mime_type,size_bytes,disk_name,sha256 FROM record_files WHERE id=? AND account_id=?" + (lock ? " FOR UPDATE" : ""),
            (row,index) -> new StoredFile(row.getString(1),row.getString(2),row.getString(3),row.getLong(4),row.getString(5),row.getString(6)), id, accountId)
            .stream().findFirst().orElseThrow(ApiException::missing);
    }

    private Path ownedPath(String diskName) {
        if (!diskName.matches("[0-9a-f-]{36}\\.(pdf|png|jpg)")) throw new IllegalStateException("Invalid private file identifier");
        Path target = root.resolve(diskName).normalize();
        if (!target.startsWith(root) || !root.equals(target.getParent())) throw new IllegalStateException("Invalid private file path");
        return target;
    }
    private void deleteDisk(Path target) {
        try { Files.deleteIfExists(target); }
        catch (IOException error) { log.warn("Private record file cleanup will require retry"); }
    }
    private static String digest(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (NoSuchAlgorithmException error) { throw new IllegalStateException("SHA-256 unavailable"); }
    }
    private record StoredFile(String id, String name, String mime, long size, String diskName, String sha256) {
        Map<String,Object> publicValue() { return Map.of("id",id,"name",name,"mimeType",mime,"size",size,"uri","/files/"+id); }
    }
    public record Download(String name, String mimeType, byte[] bytes) {}
}
