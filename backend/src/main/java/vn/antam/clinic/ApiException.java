package vn.antam.clinic;

public class ApiException extends RuntimeException {
    private final int status;
    public ApiException(int status, String detail) { super(detail); this.status = status; }
    public int status() { return status; }
    public static ApiException bad(String detail) { return new ApiException(400, detail); }
    public static ApiException missing() { return new ApiException(404, "Không tìm thấy dữ liệu trong tài khoản của bạn."); }
}
