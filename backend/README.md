# backend — Java hardware API

Spring Boot service owning hardware inventory: capacity, availability,
check-out, and check-in. Matches the endpoint table in the repo's root
`README.md` and `docs/architecture/sketch.svg`.

This is the **Java** backend only. The Node.js backend (users/projects) is a
separate service - see the root README's planned service split.

## Requirements

- Java 17+ (`java -version`)
- Maven
- A MongoDB instance. Easiest for local dev: run one in Docker:
  ```
  docker run -d -p 27017:27017 --name haas-mongo mongo:7
  ```
  Or install MongoDB Community Server directly and run it as a service.

## Run it

```
cd backend
mvn spring-boot:run
```

By default this connects to `mongodb://localhost:27017/haas` and listens on
port `8081`. Both are overridable via environment variables
(`SPRING_DATA_MONGODB_URI`, `PORT`) — see `src/main/resources/application.properties`.

## Try it

```
curl -X POST http://localhost:8081/create_hardware_set \
  -H "Content-Type: application/json" \
  -d '{"name": "HWSet1", "capacity": 10}'

curl http://localhost:8081/get_all_hw_names

curl "http://localhost:8081/get_hw_info?name=HWSet1"

curl -X POST http://localhost:8081/check_out \
  -H "Content-Type: application/json" \
  -d '{"name": "HWSet1", "quantity": 3}'

curl -X POST http://localhost:8081/check_in \
  -H "Content-Type: application/json" \
  -d '{"name": "HWSet1", "quantity": 1}'
```

Trying to check out more than what's available returns a `409` with a JSON
error body instead of a stack trace (Spring Boot's default error format for
a thrown `ResponseStatusException`).

## Run the tests

```
mvn test
```

`HardwareServiceTest` covers the checkout/check-in math against a mocked
repository (plain Mockito, from `spring-boot-starter-test`) — no real
MongoDB needed to run these.

## Structure

Deliberately flat - one package, no config/controller/service/dto/exception
sub-packages. For a service this small, that split added more file-hopping
than it saved:

```
src/main/java/com/ece461/backend/
  HardwareApiApplication.java   entry point
  CorsConfig.java                lets the React client call this API cross-origin
  HardwareController.java        the 5 HTTP endpoints (request records defined inline)
  HardwareService.java           checkout/check-in business rules + error handling
  HardwareSetRepository.java     Spring Data Mongo interface
  HardwareSet.java                the hardwareSets document, doubles as the API response shape
src/main/resources/
  application.properties         DB connection, port, CORS origin - all overridable via env vars
src/test/java/com/ece461/backend/
  HardwareServiceTest.java
```

## What's next

- Wire this up to whatever MongoDB Atlas instance we deploy to for Phase 2.
- Add `projectId` tracking to checkouts once the Node.js project API exists, so we
  know which project is holding which units (currently this tracks global
  availability only, not per-project ownership).
- Tighten CORS `allowed-origins` to the real deployed frontend URL once we have one.
- If the API's response shape ever needs to diverge from the database
  document (e.g. hiding an internal field), reintroduce a small response
  type at that point rather than upfront.
