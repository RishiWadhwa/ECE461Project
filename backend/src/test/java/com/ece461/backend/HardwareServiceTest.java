package com.ece461.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Plain unit tests against a mocked repository - no real MongoDB needed.
 * These check the business rules, not Spring wiring.
 */
class HardwareServiceTest {

    private HardwareSetRepository repository;
    private HardwareService service;

    @BeforeEach
    void setUp() {
        repository = mock(HardwareSetRepository.class);
        service = new HardwareService(repository);
        // Mockito's mock save() would otherwise return null; make it echo the argument back,
        // same as a real MongoDB save.
        when(repository.save(any(HardwareSet.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void checkOut_reducesAvailability_whenEnoughUnitsFree() {
        HardwareSet hwSet1 = new HardwareSet("HWSet1", 10, 4);
        when(repository.findByName("HWSet1")).thenReturn(Optional.of(hwSet1));

        HardwareSet result = service.checkOut("HWSet1", 3);

        assertEquals(1, result.getAvailable());
        assertEquals(10, result.getCapacity());
    }

    @Test
    void checkOut_throws_whenRequestingMoreThanAvailable() {
        HardwareSet hwSet2 = new HardwareSet("HWSet2", 5, 2);
        when(repository.findByName("HWSet2")).thenReturn(Optional.of(hwSet2));

        assertThrows(ResponseStatusException.class,
                () -> service.checkOut("HWSet2", 3));
    }

    @Test
    void checkIn_increasesAvailability_butNeverAboveCapacity() {
        HardwareSet hwSet1 = new HardwareSet("HWSet1", 10, 9);
        when(repository.findByName("HWSet1")).thenReturn(Optional.of(hwSet1));

        HardwareSet result = service.checkIn("HWSet1", 5);

        // 9 + 5 = 14, but capacity is 10, so it should clamp at 10, not overflow the pool.
        assertEquals(10, result.getAvailable());
    }

    @Test
    void getByName_throwsNotFound_forUnknownSet() {
        when(repository.findByName("HWSet3")).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class,
                () -> service.getByName("HWSet3"));
    }

    @Test
    void getAll_returnsEverythingFromRepository() {
        when(repository.findAllByOrderByNameAsc()).thenReturn(
                List.of(new HardwareSet("HWSet1", 20, 20), new HardwareSet("HWSet2", 10, 10)));

        List<HardwareSet> all = service.getAll();

        assertEquals(2, all.size());
    }
}
