package vn.antam.clinic;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1")
public class CatalogController {
    private final CatalogService catalog;
    public CatalogController(CatalogService catalog) { this.catalog=catalog; }
    @GetMapping("/doctors") List<Map<String,Object>> doctors() { return catalog.doctors(); }
    @GetMapping("/departments") List<Map<String,Object>> departments() { return catalog.departments(); }
}
