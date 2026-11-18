package vn.antam.clinic;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class CatalogService {
    private final List<Map<String,Object>> doctors;
    private final List<Map<String,Object>> departments;
    public CatalogService(ObjectMapper mapper,JdbcTemplate jdbc) throws Exception {
        try(var in=new ClassPathResource("catalog/doctors.json").getInputStream()) { doctors=mapper.readValue(in,new TypeReference<>(){}); }
        try(var in=new ClassPathResource("catalog/departments.json").getInputStream()) { departments=mapper.readValue(in,new TypeReference<>(){}); }
        for (Map<String,Object> doctor:doctors) {
            String id=(String)doctor.get("id");
            if (jdbc.queryForObject("SELECT COUNT(*) FROM doctor_locks WHERE id=?",Integer.class,id)==0) jdbc.update("INSERT INTO doctor_locks(id) VALUES(?)",id);
        }
    }
    public List<Map<String,Object>> doctors() { return doctors; }
    public List<Map<String,Object>> departments() { return departments; }
    public Map<String,Object> doctor(String id) { return doctors.stream().filter(d->id.equals(d.get("id"))).findFirst().orElseThrow(ApiException::missing); }
}
