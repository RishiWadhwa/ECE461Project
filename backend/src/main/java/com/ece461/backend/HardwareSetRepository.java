package com.ece461.backend;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data generates the implementation of this interface at runtime -
 * we never write the actual MongoDB queries by hand for these methods.
 */
public interface HardwareSetRepository extends MongoRepository<HardwareSet, String> {
    Optional<HardwareSet> findByName(String name);
    List<HardwareSet> findAllByOrderByNameAsc();
}
