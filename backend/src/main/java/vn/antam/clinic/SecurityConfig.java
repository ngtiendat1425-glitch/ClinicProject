package vn.antam.clinic;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
    @Bean CorsConfigurationSource cors(@Value("${clinic.cors-origins}") String origins) {
        List<String> allowed=Arrays.stream(origins.split(",")).map(String::trim).filter(s->!s.isEmpty()).toList();
        if (allowed.isEmpty() || allowed.stream().anyMatch(s->s.contains("*") || !(s.startsWith("http://") || s.startsWith("https://")))) throw new IllegalArgumentException("Configure explicit clinic.cors-origins");
        CorsConfiguration config=new CorsConfiguration();
        config.setAllowedOrigins(allowed); config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization","Content-Type")); config.setExposedHeaders(List.of("X-Request-Id","Content-Disposition"));
        config.setAllowCredentials(false); config.setMaxAge(600L);
        UrlBasedCorsConfigurationSource source=new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**",config); return source;
    }
    @Bean SecurityFilterChain security(HttpSecurity http,AuthService auth,ObjectMapper mapper,@Value("${clinic.auth-rate-limit:20}") int limit) throws Exception {
        http.csrf(csrf->csrf.disable()).cors(cors->{})
            .sessionManagement(session->session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(rules->rules
                .requestMatchers("/api/v1/auth/register","/api/v1/auth/login","/actuator/health").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET,"/api/v1/departments","/api/v1/doctors").permitAll()
                .requestMatchers("/actuator/**").denyAll()
                .requestMatchers("/api/v1/**").authenticated().anyRequest().denyAll())
            .exceptionHandling(errors->errors.authenticationEntryPoint((request,response,error)->writeError(mapper,request,response,401,"Vui lòng đăng nhập để tiếp tục."))
                .accessDeniedHandler((request,response,error)->writeError(mapper,request,response,403,"Bạn không có quyền thực hiện thao tác này.")))
            .headers(headers->headers.contentSecurityPolicy(csp->csp.policyDirectives("default-src 'none'; frame-ancestors 'none'")))
            .addFilterBefore(new ApiFilter(auth,mapper,limit),UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
    static void writeError(ObjectMapper mapper,HttpServletRequest request,HttpServletResponse response,int status,String detail) throws IOException {
        response.setStatus(status); response.setContentType("application/problem+json"); response.setCharacterEncoding("UTF-8");
        mapper.writeValue(response.getOutputStream(),ApiErrors.problem(status,detail,request));
    }
    static class ApiFilter extends OncePerRequestFilter {
        private final AuthService auth; private final ObjectMapper mapper; private final int limit;
        private final ConcurrentHashMap<String,Window> windows=new ConcurrentHashMap<>();
        ApiFilter(AuthService auth,ObjectMapper mapper,int limit) { this.auth=auth;this.mapper=mapper;this.limit=Math.max(1,limit); }
        protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
            String requestId=UUID.randomUUID().toString(); request.setAttribute("requestId",requestId); response.setHeader("X-Request-Id",requestId);
            if (request.getContentLengthLong()>5L*1024*1024) { writeError(mapper,request,response,413,"Nội dung tải lên vượt quá giới hạn.");return; }
            if (request.getMethod().equals("POST") && Set.of("/api/v1/auth/login","/api/v1/auth/register").contains(request.getRequestURI()) && !allow(request.getRemoteAddr())) {
                response.setHeader("Retry-After","60"); writeError(mapper,request,response,429,"Có quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau.");return;
            }
            String header=request.getHeader("Authorization");
            if (header!=null) {
                String id=header.startsWith("Bearer ") ? auth.accountId(header.substring(7)) : null;
                if (id==null) { writeError(mapper,request,response,401,"Phiên đăng nhập đã hết hạn hoặc không hợp lệ.");return; }
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(id,null,List.of(new SimpleGrantedAuthority("ROLE_PATIENT"))));
            }
            chain.doFilter(request,response);
        }
        private boolean allow(String key) {
            long now=System.currentTimeMillis();
            if (windows.size()>=10000) { windows.entrySet().removeIf(entry->entry.getValue().until<now); if (!windows.containsKey(key) && windows.size()>=10000) return false; }
            Window window=windows.compute(key,(ignored,current)->current==null||current.until<now?new Window(now+60000):current);
            synchronized(window) { return ++window.count<=limit; }
        }
        static class Window { final long until; int count=0; Window(long until) {this.until=until;} }
    }
}
