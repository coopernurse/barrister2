# Barrister RPC

Barrister is a remote procedure call system similar to gRPC that uses JSON-RPC encoded messages but 
adds an interface definition system so that the message payloads can be easily documented (for humans)
and validated (by computers).

To use Barrister you author an IDL file that describes the services you wish to expose along with the 
input and output types related to the service calls.

Here's a simple example:

```
// This is a comment
interface UserService {
    save(input SaveUserRequest) SaveUserResponse
}

struct SaveUserRequest {
    firstName string 
    lastName  string 
    email     string   [optional]   // optional fields are nullable, other fields are non-null by default
    role      UserRole
}

struct SaveUserResponse {
    userId string   // generated user ID
}

enum UserRole {
    admin
    employee
    customer
}
```