package vn.antam.clinic;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
public class RecordService {
    private final JdbcTemplate jdbc;
    private final JsonStore json;
    private final FileService files;
    public RecordService(JdbcTemplate jdbc, JsonStore json, FileService files) { this.jdbc=jdbc; this.json=json; this.files=files; }

    public Map<String,Object> insurance(String accountId) {
        return jdbc.query("SELECT card_json FROM insurance_cards WHERE account_id=?", (row,index)->json.read(row.getString(1)), accountId).stream().findFirst().orElse(null);
    }

    @Transactional
    public Map<String,Object> saveInsurance(String accountId, Map<String,Object> body) {
        files.lockAccount(accountId);
        String number = Inputs.text(body, "number", 10, 25).replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
        if (!number.matches("(?:\\d{10}|[A-Z]{2}\\d{13})")) throw ApiException.bad("Mã BHYT cần gồm 10 chữ số hoặc 2 chữ cái và 13 chữ số.");
        String holderName = Inputs.text(body,"holderName",2,100);
        String birthDate = Inputs.text(body,"birthDate",10,10);
        String place = Inputs.text(body,"registrationPlace",3,200);
        String validFrom = Inputs.text(body,"validFrom",10,10), validTo = Inputs.text(body,"validTo",10,10);
        LocalDate birth = Inputs.date(birthDate), from = Inputs.date(validFrom), to = Inputs.date(validTo);
        if (birth.isAfter(LocalDate.now(Inputs.VN)) || from.isBefore(birth) || to.isBefore(from)) throw ApiException.bad("Ngày sinh hoặc khoảng thời gian sử dụng thẻ chưa hợp lệ.");
        Map<String,Object> previous = insurance(accountId);
        String id = previous == null ? UUID.randomUUID().toString() : (String) previous.get("id");
        Map<String,Object> card = new LinkedHashMap<>();
        card.put("id",id); card.put("number",number); card.put("holderName",holderName); card.put("birthDate",birthDate);
        card.put("registrationPlace",place); card.put("validFrom",validFrom); card.put("validTo",validTo); card.put("updatedAt",Instant.now().toString());
        Map<String,Object> attachment = files.replaceRecordAttachment(accountId,"insurance",id,body.get("attachment"));
        if (attachment != null) card.put("attachment",attachment);
        if (previous == null) jdbc.update("INSERT INTO insurance_cards(account_id,card_json) VALUES(?,?)",accountId,json.write(card));
        else jdbc.update("UPDATE insurance_cards SET card_json=? WHERE account_id=?",json.write(card),accountId);
        return card;
    }

    @Transactional
    public void deleteInsurance(String accountId) {
        files.lockAccount(accountId);
        Map<String,Object> card = insurance(accountId);
        if (card == null) return;
        files.replaceRecordAttachment(accountId,"insurance",(String)card.get("id"),null);
        jdbc.update("DELETE FROM insurance_cards WHERE account_id=?",accountId);
    }

    public List<Map<String,Object>> certificates(String accountId) {
        return jdbc.query("SELECT certificate_json FROM certificates WHERE account_id=? ORDER BY id", (row,index)->json.read(row.getString(1)), accountId)
            .stream().sorted(Comparator.comparing(item -> (String)item.get("createdAt"), Comparator.reverseOrder())).toList();
    }

    @Transactional
    public Map<String,Object> addCertificate(String accountId, Map<String,Object> body) {
        files.lockAccount(accountId);
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM certificates WHERE account_id=?",Integer.class,accountId);
        if (count != null && count >= 30) throw new ApiException(409,"Đã đạt giới hạn 30 giấy khám sức khỏe trong hồ sơ.");
        String title = Inputs.text(body,"title",3,120), issuer = Inputs.text(body,"issuer",3,200);
        String purpose = Inputs.text(body,"purpose",1,30);
        if (!Set.of("employment","study","driving","other").contains(purpose)) throw ApiException.bad("Mục đích sử dụng chưa hợp lệ.");
        String examDate = Inputs.text(body,"examDate",10,10);
        LocalDate exam = Inputs.date(examDate);
        if (exam.isAfter(LocalDate.now(Inputs.VN))) throw ApiException.bad("Ngày khám không được ở tương lai.");
        String validUntil = Inputs.optional(body,"validUntil",10);
        if (!validUntil.isBlank() && Inputs.date(validUntil).isBefore(exam)) throw ApiException.bad("Ngày hết hạn cần từ ngày khám trở đi.");
        String notes = Inputs.optional(body,"notes",1000);
        if (body.get("attachment") == null) throw ApiException.bad("Vui lòng tải bản chụp hoặc PDF giấy khám đã được cấp.");
        String id = UUID.randomUUID().toString();
        Map<String,Object> attachment = files.replaceRecordAttachment(accountId,"certificate",id,body.get("attachment"));
        Map<String,Object> result = new LinkedHashMap<>();
        result.put("id",id); result.put("title",title); result.put("purpose",purpose); result.put("issuer",issuer);
        result.put("examDate",examDate); result.put("notes",notes); result.put("attachment",attachment);
        result.put("status","unverified"); result.put("createdAt",Instant.now().toString());
        if (!validUntil.isBlank()) result.put("validUntil",validUntil);
        jdbc.update("INSERT INTO certificates(id,account_id,certificate_json) VALUES(?,?,?)",id,accountId,json.write(result));
        return result;
    }

    @Transactional
    public void deleteCertificate(String accountId, String id) {
        files.lockAccount(accountId);
        List<String> existing = jdbc.query("SELECT id FROM certificates WHERE account_id=? AND id=?",(row,index)->row.getString(1),accountId,id);
        if (existing.isEmpty()) throw ApiException.missing();
        files.replaceRecordAttachment(accountId,"certificate",id,null);
        jdbc.update("DELETE FROM certificates WHERE id=? AND account_id=?",id,accountId);
    }
}
