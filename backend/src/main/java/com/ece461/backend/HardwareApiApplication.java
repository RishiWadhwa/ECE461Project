package com.ece461.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Java backend. Owns the hardware side of the app:
 * hardware sets (capacity, availability), check-out and check-in.
 *
 * The Node.js backend owns users and projects; both services read/write
 * the same MongoDB instance (see docs/architecture/sketch.svg).
 */
@SpringBootApplication
public class HardwareApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(HardwareApiApplication.class, args);
    }
}
