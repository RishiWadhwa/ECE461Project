package com.ece461.backend;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * All the actual business rules live here, not in the controller. Keeping
 * this separate from HardwareController means we can unit-test
 * checkout/check-in math without spinning up a web server.
 *
 * Errors are reported with ResponseStatusException - Spring Boot turns
 * these into a JSON error body automatically, so we don't need a separate
 * custom-exception-plus-handler pair for a project this size.
 */
@Service
public class HardwareService {

    private final HardwareSetRepository repository;

    public HardwareService(HardwareSetRepository repository) {
        this.repository = repository;
    }

    public List<HardwareSet> getAll() {
        return repository.findAllByOrderByNameAsc();
    }

    public HardwareSet getByName(String name) {
        return repository.findByName(name)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No hardware set named '" + name + "'"));
    }

    public HardwareSet create(String name, int capacity) {
        HardwareSet hw = new HardwareSet(name, capacity, capacity);
        return repository.save(hw);
    }

    /** Shared validation for checkout amounts: no negative, no over-capacity. */
    public HardwareSet checkOut(String name, int quantity) {
        HardwareSet hw = getByName(name);
        if (quantity > hw.getAvailable()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot check out " + quantity + " of '" + name + "' - only " + hw.getAvailable() + " available");
        }
        hw.setAvailable(hw.getAvailable() - quantity);
        return repository.save(hw);
    }

    public HardwareSet checkIn(String name, int quantity) {
        HardwareSet hw = getByName(name);
        int newAvailable = hw.getAvailable() + quantity;
        // Never let check-ins push availability above capacity - that would mean
        // more units are "in" than the system actually owns.
        hw.setAvailable(Math.min(newAvailable, hw.getCapacity()));
        return repository.save(hw);
    }
}
