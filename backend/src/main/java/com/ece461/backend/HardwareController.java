package com.ece461.backend;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * The 5 hardware endpoints listed in the root README's API surface table.
 *
 * Request bodies are plain Java records (CheckoutRequest, CreateRequest,
 * below) instead of separate classes in their own files - one less package
 * to navigate for a service this small. Responses return the HardwareSet
 * model directly; if we ever need the API's shape to diverge from the
 * database's, that's the point to reintroduce a separate response type.
 */
@RestController
public class HardwareController {

    private final HardwareService service;

    public HardwareController(HardwareService service) {
        this.service = service;
    }

    @GetMapping("/get_all_hw_names")
    public List<String> getAllHwNames() {
        return service.getAll().stream().map(HardwareSet::getName).toList();
    }

    @GetMapping("/get_hw_info")
    public HardwareSet getHwInfo(@RequestParam String name) {
        return service.getByName(name);
    }

    @PostMapping("/create_hardware_set")
    public HardwareSet createHardwareSet(@Valid @RequestBody CreateRequest req) {
        return service.create(req.name(), req.capacity());
    }

    @PostMapping("/check_out")
    public HardwareSet checkOut(@Valid @RequestBody CheckoutRequest req) {
        return service.checkOut(req.name(), req.quantity());
    }

    @PostMapping("/check_in")
    public HardwareSet checkIn(@Valid @RequestBody CheckoutRequest req) {
        return service.checkIn(req.name(), req.quantity());
    }

    public record CreateRequest(
            @NotBlank(message = "name is required") String name,
            @Min(value = 0, message = "capacity cannot be negative") int capacity) {
    }

    public record CheckoutRequest(
            @NotBlank(message = "name is required") String name,
            @Min(value = 1, message = "quantity must be at least 1") int quantity) {
    }
}
