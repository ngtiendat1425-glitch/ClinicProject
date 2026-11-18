package vn.antam.clinic;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;

@Service
public class AuthService {
    private final JdbcTemplate jdbc;
    private final JsonStore json;
    private final PasswordEncoder passwords;
    private final SecureRandom random = new SecureRandom();
    private final long tokenHours;
    private final String dummyHash;
    public AuthService(JdbcTemplate jdbc, JsonStore json, PasswordEncoder passwords, @Value("${clinic.token-hours:8}") long tokenHours) {
        this.jdbc = jdbc; this.json = json; this.passwords = passwords; this.tokenHours = tokenHours;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }
    @Transactional
    public Map<String,Object> register(Map<String,Object> body) {
        String name = Inputs.text(body, "name", 2, 80);
        String phone = Inputs.phone(Inputs.text(body, "phone", 10, 25));
        String email = Inputs.email(Inputs.text(body, "email", 3, 254));
        String birthDate = Inputs.text(body, "birthDate", 10, 10);
        if (Inputs.date(birthDate).isAfter(LocalDate.now(Inputs.VN)) || Inputs.date(birthDate).isBefore(LocalDate.of(1900,1,1))) throw ApiException.bad("Ngày sinh chưa hợp lệ.");
        Object rawPassword = body.get("password");
        if (!(rawPassword instanceof String password) || password.length() < 8 || password.getBytes(StandardCharsets.UTF_8).length > 72) throw ApiException.bad("Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte UTF-8.");
        if (!password.equals(body.get("confirmPassword")) || !Boolean.TRUE.equals(body.get("acceptedTerms"))) throw ApiException.bad("Vui lòng xác nhận mật khẩu và điều khoản sử dụng.");
        if (jdbc.queryForObject("SELECT COUNT(*) FROM patient_accounts WHERE phone=? OR email=?", Integer.class, phone, email) > 0) throw new ApiException(409, "Số điện thoại hoặc email đã được sử dụng.");
        String id = UUID.randomUUID().toString();
        String createdAt = Instant.now().toString();
        Map<String,Object> patient = new LinkedHashMap<>(Map.of("name",name,"phone",phone,"email",email,"birthDate",birthDate,"gender","Chưa cung cấp","address","","allergies","Chưa khai báo"));
        jdbc.update("INSERT INTO patient_accounts(id,phone,email,password_hash,patient_json,created_at) VALUES(?,?,?,?,?,?)", id,phone,email,passwords.encode(password),json.write(patient),createdAt);
        return response(id);
    }
    @Transactional
    public Map<String,Object> login(Map<String,Object> body) {
        String identifier = Inputs.text(body, "identifier", 3, 254).toLowerCase(Locale.ROOT);
        if (!identifier.contains("@")) identifier = Inputs.phone(identifier);
        String password = Inputs.text(body, "password", 1, 200);
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) throw new ApiException(401,"Thông tin đăng nhập chưa chính xác.");
        List<Map<String,Object>> rows = jdbc.queryForList("SELECT id,password_hash FROM patient_accounts WHERE phone=? OR email=?",identifier,identifier);
        String hash = rows.isEmpty() ? dummyHash : (String)rows.getFirst().get("password_hash");
        boolean matches = passwords.matches(password, hash);
        if (rows.isEmpty() || !matches) throw new ApiException(401,"Thông tin đăng nhập chưa chính xác.");
        return response((String)rows.getFirst().get("id"));
    }
    private Map<String,Object> response(String id) {
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        jdbc.update("INSERT INTO access_tokens(token_hash,account_id,expires_at) VALUES(?,?,?)", digest(token),id,Instant.now().plus(Duration.ofHours(tokenHours)).toEpochMilli());
        return Map.of("token",token,"account",account(id));
    }
    public String accountId(String token) {
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) return null;
        return jdbc.query("SELECT account_id FROM access_tokens WHERE token_hash=? AND expires_at>?", (row,index)->row.getString(1),digest(token),System.currentTimeMillis()).stream().findFirst().orElse(null);
    }
    public Map<String,Object> account(String id) {
        return jdbc.query("SELECT patient_json,created_at FROM patient_accounts WHERE id=?", (row,index)->Map.<String,Object>of("id",id,"patient",json.read(row.getString(1)),"createdAt",row.getString(2)),id).stream().findFirst().orElseThrow(ApiException::missing);
    }
    public void logout(String token) { jdbc.update("DELETE FROM access_tokens WHERE token_hash=?",digest(token)); }
    @Transactional
    public Map<String,Object> updatePatient(String id, Map<String,Object> body) {
        Map<String,Object> patient = new LinkedHashMap<>();
        patient.put("name",Inputs.text(body,"name",2,80));
        patient.put("phone",Inputs.phone(Inputs.text(body,"phone",10,25)));
        patient.put("email",Inputs.email(Inputs.text(body,"email",3,254)));
        String birthDate=Inputs.text(body,"birthDate",10,10);
        if (Inputs.date(birthDate).isAfter(LocalDate.now(Inputs.VN)) || Inputs.date(birthDate).isBefore(LocalDate.of(1900,1,1))) throw ApiException.bad("Ngày sinh chưa hợp lệ.");
        patient.put("birthDate",birthDate);
        String gender=Inputs.text(body,"gender",1,30);
        if (!Set.of("Nam","Nữ","Khác","Chưa cung cấp").contains(gender)) throw ApiException.bad("Giới tính chưa hợp lệ.");
        patient.put("gender",gender); patient.put("address",Inputs.optional(body,"address",300)); patient.put("allergies",Inputs.optional(body,"allergies",500));
        jdbc.update("UPDATE patient_accounts SET phone=?,email=?,patient_json=? WHERE id=?",patient.get("phone"),patient.get("email"),json.write(patient),id);
        return patient;
    }
    @Scheduled(fixedDelay=60000)
    public void cleanTokens() { jdbc.update("DELETE FROM access_tokens WHERE expires_at<=?",System.currentTimeMillis()); }
    public static String digest(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException("SHA-256 unavailable"); }
    }
}
