package vn.antam.clinic;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;

public final class Inputs {
    private Inputs() {}
    public static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    public static String text(Map<String,?> body, String key, int min, int max) {
        Object value = body.get(key);
        if (!(value instanceof String)) throw ApiException.bad("Thiếu hoặc sai trường dữ liệu: " + key);
        String text = ((String)value).trim();
        if (text.length() < min || text.length() > max) throw ApiException.bad("Độ dài trường dữ liệu chưa hợp lệ: " + key);
        return text;
    }
    public static String optional(Map<String,?> body, String key, int max) {
        return body.get(key) == null ? "" : text(body, key, 0, max);
    }
    public static LocalDate date(String value) {
        if (!value.matches("\\d{4}-\\d{2}-\\d{2}")) throw ApiException.bad("Ngày cần theo định dạng YYYY-MM-DD.");
        try { return LocalDate.parse(value); }
        catch (Exception e) { throw ApiException.bad("Ngày chưa hợp lệ."); }
    }
    public static String phone(String value) {
        String phone = value.replaceAll("[\\s.\\-]", "");
        if (phone.matches("\\+84\\d{9}")) phone = "0" + phone.substring(3);
        if (!phone.matches("0\\d{9}")) throw ApiException.bad("Số điện thoại chưa hợp lệ.");
        return phone;
    }
    public static String email(String value) {
        String email = value.trim().toLowerCase(java.util.Locale.ROOT);
        if (email.length() > 254 || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) throw ApiException.bad("Email chưa hợp lệ.");
        return email;
    }
}
