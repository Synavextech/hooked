---
trigger: always_on
---

## System design, & config Guide 
Full stack website for  hooked.ink socialization platform 
create social interaction website called hooked
- a social interaction platform where users can interact and select people to connect with, one user can connect to other uses and wait for users to accept their connection - when a connection request is made, ones user profile can be seen. before a connection request is made users can only see the basic website profile details; names, country and profile pictures
#### tech stack
### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Validation**: Zod
- **Real-Time**: socket.io-client
- **Axios**: (interceptors)
### Backend Architecture
- **Runtime**: Node.js with Express.js server>
### Database - supabase
**Other**: dotenv 16.4.5 (env management)
### Security Measures:
- **Input Validation**: Using Zod for schema validation on both frontend and backend
- **Authentication**: Cookie-based sessions with secure handling
- **Role-Based Access Control**: Ensuring users can only access permitted resources
- Role-Based Access Control
- **Admin**: Complete platform control, access to admin dashboard
- **Regular Users**: Access to services offered
- **Role stored in user.role field** -yu6 checked throughout application