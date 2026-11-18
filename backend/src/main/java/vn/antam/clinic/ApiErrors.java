package vn.antam.clinic;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import java.util.UUID;

@RestControllerAdvice
public class ApiErrors {
    public static ProblemDetail problem(int status, String detail, HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatusCode.valueOf(status), detail);
        Object id = request.getAttribute("requestId");
        problem.setProperty("requestId", id == null ? UUID.randomUUID().toString() : id.toString());
        return problem;
    }
    @ExceptionHandler(ApiException.class)
    ResponseEntity<ProblemDetail> api(ApiException error, HttpServletRequest request) {
        return ResponseEntity.status(error.status()).body(problem(error.status(), error.getMessage(), request));
    }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class, IllegalArgumentException.class})
    ResponseEntity<ProblemDetail> invalid(Exception error, HttpServletRequest request) {
        return ResponseEntity.badRequest().body(problem(400, "Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra các trường dữ liệu.", request));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ProblemDetail> conflict(Exception error, HttpServletRequest request) {
        return ResponseEntity.status(409).body(problem(409, "Dữ liệu đã tồn tại hoặc đã thay đổi. Vui lòng kiểm tra lại.", request));
    }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ProblemDetail> tooLarge(Exception error, HttpServletRequest request) {
        return ResponseEntity.status(413).body(problem(413, "Tệp tải lên vượt quá giới hạn cho phép.", request));
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> unexpected(Exception error, HttpServletRequest request) {
        // Never expose exception messages, SQL, request content, or patient data.
        return ResponseEntity.internalServerError().body(problem(500, "Không thể xử lý yêu cầu. Vui lòng thử lại với mã tham chiếu này.", request));
    }
}
