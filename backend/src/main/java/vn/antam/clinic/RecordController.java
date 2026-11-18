package vn.antam.clinic;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/v1")
public class RecordController {
    private final RecordService records;
    public RecordController(RecordService records) { this.records=records; }

    @GetMapping("/insurance")
    ResponseEntity<Map<String,Object>> insurance(Principal principal) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(records.insurance(principal.getName())); }
    @PutMapping("/insurance")
    Map<String,Object> saveInsurance(Principal principal, @RequestBody Map<String,Object> body) { return records.saveInsurance(principal.getName(),body); }
    @DeleteMapping("/insurance")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteInsurance(Principal principal) { records.deleteInsurance(principal.getName()); }

    @GetMapping("/certificates")
    ResponseEntity<List<Map<String,Object>>> certificates(Principal principal) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(records.certificates(principal.getName())); }
    @PostMapping("/certificates")
    @ResponseStatus(HttpStatus.CREATED)
    Map<String,Object> addCertificate(Principal principal, @RequestBody Map<String,Object> body) { return records.addCertificate(principal.getName(),body); }
    @DeleteMapping("/certificates/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteCertificate(Principal principal, @PathVariable String id) { records.deleteCertificate(principal.getName(),id); }
}
