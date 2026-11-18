package vn.antam.clinic;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth=auth; }
    @PostMapping("/auth/register") ResponseEntity<Map<String,Object>> register(@RequestBody Map<String,Object> body) { return ResponseEntity.status(201).body(auth.register(body)); }
    @PostMapping("/auth/login") Map<String,Object> login(@RequestBody Map<String,Object> body) { return auth.login(body); }
    @GetMapping("/auth/me") Map<String,Object> me(Principal principal) { return auth.account(principal.getName()); }
    @PostMapping("/auth/logout") ResponseEntity<Void> logout(@RequestHeader("Authorization") String header) { auth.logout(header.substring(7)); return ResponseEntity.noContent().build(); }
    @PutMapping("/profile") Map<String,Object> profile(Principal principal,@RequestBody Map<String,Object> body) { return auth.updatePatient(principal.getName(),body); }
}
