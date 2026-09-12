# ServeMesh — Distributed Real-Time Service Marketplace

A microservices-based backend for a real-time service marketplace (like Urban Company), demonstrating event-driven architecture, service decoupling, and real-time communication at scale.

## Architecture

```
                          React / Next.js (future)
                                    |
                                    v
                            API Gateway (:4000)
                                    |
              +---------------------+---------------------+
              |                     |                     |
              v                     v                     v
        Auth Service          Booking Service       Vendor Service
          (:4001)                (:4002)               (:4003)
              |                     |                     |
              v                     v                     v
          auth-db              booking-db            vendor-db
        (PostgreSQL)          (PostgreSQL)          (PostgreSQL)
                                    |
                                    v
                                  Kafka
                                    |
                    +---------------+---------------+
                    |                               |
                    v                               v
          Notification Service              Analytics Service
               (:4004)                          (planned)
                    |
                    v
              Redis Pub/Sub
                    |
                    v
           WebSocket Server (:4005)
                    |
                    v
             Connected Clients
```


## Tech Stack

- **Runtime:** Node.js, Express
- **Databases:** PostgreSQL (one per service — database-per-service pattern)
- **Messaging:** Apache Kafka (event-driven communication between services)
- **Cache/Pub-Sub:** Redis (real-time chat distribution, rate limiting)
- **Real-time:** Socket.IO (WebSockets)
- **Auth:** JWT with role-based access control (user / vendor / admin)
- **Containerization:** Docker, Docker Compose

## Services

| Service | Responsibility | Port |
|---|---|---|
| api-gateway | Single entry point, routes requests to internal services | 4000 |
| auth-service | Signup, login, JWT issuing, RBAC | 4001 |
| booking-service | Create bookings, update status, publishes Kafka events | 4002 |
| vendor-service | Vendor registration, admin approval workflow | 4003 |
| notification-service | Kafka consumer, publishes real-time updates via Redis | 4004 |
| websocket-server | Real-time chat + booking status updates via Socket.IO | 4005 |

## Key Architectural Patterns

**Event-Driven Communication:** When a booking is created or its status changes, `booking-service` publishes an event to Kafka. `notification-service` consumes these events independently — the two services have no direct knowledge of each other, enabling loose coupling and independent scaling.

**Real-Time Fan-Out via Redis Pub/Sub:** The WebSocket layer uses Redis Pub/Sub so that multiple WebSocket server instances can stay in sync. A message published by any instance reaches all connected clients across all instances, regardless of which one they're connected to.

**Database-Per-Service:** Each service owns its own PostgreSQL database, preventing tight coupling at the data layer.

**Role-Based Access Control:** JWT tokens carry the user's role (user/vendor/admin), verified independently by each service via shared middleware.

## Running Locally

```cmd
git clone https://github.com/YOUR_USERNAME/servemesh-microservices.git
cd servemesh-microservices
docker-compose up --build
```

Wait for all services to report `listening on port...`, then verify each health check:

| Service | Health Check URL |
|---|---|
| API Gateway | http://localhost:4000/health |
| Auth Service | http://localhost:4001/health |
| Booking Service | http://localhost:4002/health |
| Vendor Service | http://localhost:4003/health |
| Notification Service | http://localhost:4004/health |
| WebSocket Server | http://localhost:4005/health |

A Postman collection with example requests is included in `/postman`.

## What This Project Demonstrates

This project was built to practice and demonstrate distributed systems concepts commonly required in backend/system-design interviews: service decomposition, asynchronous event-driven communication, horizontal scalability patterns (Redis Pub/Sub), and containerized multi-service deployment.