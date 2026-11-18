package vn.antam.clinic;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class FileController {
    private final FileService files;
    public FileController(FileService files) { this.files = files; }

    @PostMapping(value="/attachments", consumes=MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    Map<String,Object> upload(Principal principal, @RequestBody Map<String,Object> body) { return files.upload(principal.getName(), body); }

    @PostMapping(value="/files", consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    Map<String,Object> multipart(Principal principal, @RequestParam("file") MultipartFile file) { return files.uploadMultipart(principal.getName(), file); }

    @GetMapping({"/files/{id}", "/attachments/{id}"})
    ResponseEntity<byte[]> download(Principal principal, @PathVariable String id) {
        FileService.Download download = files.download(principal.getName(), id);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(download.mimeType()))
            .contentLength(download.bytes().length).cacheControl(CacheControl.noStore())
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(download.name(), StandardCharsets.UTF_8).build().toString())
            .header("X-Content-Type-Options", "nosniff").body(download.bytes());
    }

    @DeleteMapping({"/attachments/{id}", "/files/{id}"})
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(Principal principal, @PathVariable String id) { files.deleteOrphan(principal.getName(), id); }
}
