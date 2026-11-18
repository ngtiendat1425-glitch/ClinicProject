package vn.antam.clinic;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import java.util.Map;

@Component
public class JsonStore {
    private final ObjectMapper mapper;
    public JsonStore(ObjectMapper mapper) { this.mapper = mapper; }
    public String write(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (Exception e) { throw new IllegalStateException("Cannot serialize stored data"); }
    }
    public Map<String,Object> read(String value) {
        try { return mapper.readValue(value, new TypeReference<>() {}); }
        catch (Exception e) { throw new IllegalStateException("Cannot read stored data"); }
    }
}
