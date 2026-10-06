package com.ece461.backend;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * One entry in the shared hardware pool (e.g. "HWSet1", "HWSet2").
 * Maps to the `hardwareSets` collection described in the root README
 * and docs/architecture/sketch.svg.
 *
 * capacity  = total units the system owns
 * available = units not currently checked out by any project
 */
@Document(collection = "hardwareSets")
public class HardwareSet {

    @Id
    private String id;

    private String name;
    private int capacity;
    private int available;

    public HardwareSet() {
        // required by Spring Data for deserialization
    }

    public HardwareSet(String name, int capacity, int available) {
        this.name = name;
        this.capacity = capacity;
        this.available = available;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getCapacity() {
        return capacity;
    }

    public void setCapacity(int capacity) {
        this.capacity = capacity;
    }

    public int getAvailable() {
        return available;
    }

    public void setAvailable(int available) {
        this.available = available;
    }
}
