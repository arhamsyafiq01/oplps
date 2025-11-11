# OPLPS - Ocell Panel Loose Part System

OPLPS is a full-stack web application designed to track and manage loose manufacturing components, providing a real-time inventory management dashboard. The system features a multi-step approval workflow, role-based access control, a notification system for aging stock, and a complete action history log for traceability.

![OPLPS Screenshot]([link_to_your_screenshot_1.png])
*Caption: The main 'Approved Part Inventory' dashboard.*

---

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
  - [Database ERD](#database-erd)
  - [Application Flow](#application-flow)
- [Setup and Installation](#setup-and-installation)
  - [Prerequisites](#prerequisites)
  - [Backend Setup (PHP API)](#backend-setup-php-api)
  - [Frontend Setup (React App)](#frontend-setup-react-app)
- [Usage](#usage)
  - [User Roles](#user-roles)
  - [Key Workflows](#key-workflows)
- [API Endpoints](#api-endpoints)
- [Future Improvements](#future-improvements)

---

## Features

- **Inventory Management:** Full CRUD (Create, Read, Update, Delete) functionality for part items.
- **Role-Based Access Control (RBAC):**
  - **Admin:** Manages users and has full system access.
  - **Supervisor:** Approves/rejects new parts, manages inventory, and can view all data.
  - **Operator:** Can add new parts (returns) which enter a pending state.
- **Approval Workflow:** New parts must be approved by a Supervisor before being added to the active inventory.
- **Barcode Scanning:** Integrated a browser-based barcode scanner in the "Add Item" modal for fast and accurate part number entry.
- **Notification System:** A dedicated page highlights parts that have been in stock for over 14, 30, and 90 days, helping to prioritize their use.
- **Action History Log:** A comprehensive audit trail (`part_event_log`) records every significant action (add, edit, approve, issue out, damage, delete) for full traceability.
- **Data Visualization:** A statistics dashboard displays key metrics, such as the number of parts added over time (monthly, quarterly, annually).
- **Responsive UI:** Built with Tailwind CSS, the interface is designed to work on both desktop and mobile browsers.

![Notification Screenshot]([link_to_your_screenshot_2.png])
*Caption: The notification page showing overdue items.*

---

## Technology Stack

- **Frontend:**
  - [React](https://reactjs.org/) (with TypeScript)
  - [Vite](https://vitejs.dev/) as the build tool
  - [React Router](https://reactrouter.com/) for page navigation
  - [Tailwind CSS](https://tailwindcss.com/) for styling
  - [ApexCharts](https://apexcharts.com/) for data visualization
  - [@zxing/library](https://github.com/zxing-js/library) for barcode scanning

- **Backend:**
  - [PHP](https://www.php.net/) (procedural style with RESTful principles)
  - [MySQL](https://www.mysql.com/) for the database

- **Development Environment:**
  - [XAMPP](https://www.apachefriends.org/) (or any other Apache/MySQL/PHP stack)
  - [Node.js](https://nodejs.org/) and npm/yarn for frontend development

---

## System Architecture

### Database ERD

The database consists of several core tables to manage users, roles, parts, and their historical events.

*(You can embed an image of the Mermaid ERD here. Take a screenshot of the diagram I provided earlier and upload it to your repo.)*
![Database ERD]([link_to_your_erd_image.png])

- **`user` & `role`:** Manages user accounts and their permissions.
- **`part`, `type`, `status`:** The core inventory tables for part details.
- **`part_event_log`:** The central table for tracking all historical actions.
- **`issue` & `damage` (Legacy/Event Source):** Tables that record specific outbound actions, which also create entries in `part_event_log`.

### Application Flow

1.  **Login:** A user logs in, and their `user_id` and `user_role_code` are stored in the PHP session.
2.  **Part Return:** An Operator adds a new part, which is inserted into the `part` table with a "Pending" status. An "ADD" event is logged.
3.  **Approval:** A Supervisor views the pending part and clicks "Approve". The part's status is updated to "Approved", and an "APPROVE" event is logged.
4.  **Inventory View:** Users can view the list of approved, in-stock items.
5.  **Action:** A user performs an "Issue Out" or "Damage" action. The `part` table's quantity is updated, and an "ISSUE" or "DAMAGE" event is logged in `part_event_log`.
6.  **History:** The history page queries the `part_event_log` table to display a complete audit trail.

---

## Setup and Installation

### Prerequisites

- A web server stack like [XAMPP](https://www.apachefriends.org/) or WAMP (with Apache, PHP 8+, and MySQL/MariaDB).
- [Node.js](https://nodejs.org/) (v16 or later) and npm or yarn.
- A web browser that supports the `getUserMedia` API for camera access (e.g., Chrome, Firefox, Safari on HTTPS or localhost).

### Backend Setup (PHP API)

1.  **Clone the Repository:**
    ```bash
    git clone [your_github_repo_url]
    ```

2.  **Place Backend Files:**
    Copy the contents of the `/api` (or your PHP project's root) folder into your web server's `htdocs` or `www` directory (e.g., `C:/xampp/htdocs/oplps_api`).

3.  **Create the Database:**
    -   Open phpMyAdmin (usually at `http://localhost/phpmyadmin`).
    -   Create a new database named `oplps_db`.
    -   Go to the "Import" tab, select the `database_schema.sql` file (the SQL dump you provided) from the repository, and execute it to create all the tables and insert initial data.

4.  **Configure Database Connection:**
    -   Open the PHP files that contain database connection details (e.g., `api/config/db.php`, `api/part.php`, etc.).
    -   Verify that the `$servername`, `$username`, `$password`, and `$dbname` variables match your local database setup.

5.  **Configure CORS:**
    -   In your PHP API files (like `part.php`, `user_management.php`, `get_roles.php`, etc.), find the `$allowed_frontend_origin` variable.
    -   Set it to the URL of your running React development server (e.g., `http://localhost:2012`).
        ```php
        $allowed_frontend_origin = 'http://localhost:2012'; // Example
        ```

### Frontend Setup (React App)

1.  **Navigate to the Frontend Directory:**
    Open a terminal and navigate to the folder containing your React project (the one with `package.json`).

2.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Environment Variables:**
    -   In the root of your frontend project, create a file named `.env`.
    -   Add the URLs for your local PHP API endpoints:
        ```env
        VITE_PARTS_API_URL=http://localhost/oplps_api/api/part.php
        VITE_TYPES_API_URL=http://localhost/oplps_api/api/type.php
        VITE_STATUS_API_URL=http://localhost/oplps_api/api/status.php
        VITE_ISSUE_API_URL=http://localhost/oplps_api/api/issue.php
        VITE_DAMAGE_API_URL=http://localhost/oplps_api/api/damage.php
        VITE_HISTORY_API_URL=http://localhost/oplps_api/api/history.php
        VITE_ADD_USER_API_URL=http://localhost/oplps_api/api/add_user.php
        VITE_GET_ROLES_API_URL=http://localhost/oplps_api/api/get_roles.php
        VITE_USER_MANAGEMENT_API_URL=http://localhost/oplps_api/api/user_management.php
        VITE_STATISTICS_API_URL=http://localhost/oplps_api/api/statistics.php
        # Add any other API URLs you have
        ```
    *Note: The `VITE_` prefix is specific to Vite. If you used Create React App, it would be `REACT_APP_`.*

4.  **Run the Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The application should now be running at `http://localhost:2012` (or your configured port).

---

## Usage

### User Roles

-   **Admin (`ADMIN`):** Can do everything a Supervisor can do, plus manage user accounts (add, edit, delete).
-   **Supervisor (`SUPV`):** Can approve new parts, edit/delete pending parts, and perform all standard inventory actions (issue, damage).
-   **Operator (`OPER`):** Can add new part returns (which become "Pending") and edit them before approval.

### Key Workflows

-   **Adding an Item:** Navigate to "Return Loose Part Item", click "Add Item", fill in the form (or use the barcode scanner), and submit. The item will appear in the list with a "Pending" status.
-   **Approving an Item:** A Supervisor or Admin can click the "Approve" button on a pending item in the list.
-   **Issuing an Item:** On the "List Part Item" or "Notification" page, click the "Issue Out" button on an approved item and complete the modal form.
-   **Viewing History:** Navigate to the "History" page to see a complete log of all actions. Use the filters to narrow down the results.

---

## API Endpoints

-   `GET /part.php`: Fetches a list of all parts.
-   `POST /part.php`: Adds a new part.
-   `PUT /part.php`: Updates, approves, or deletes a part based on an `action` in the payload.
-   `POST /issue.php`: Records an "issue out" event and updates part quantity.
-   `POST /damage.php`: Records a "damage" event and updates part quantity.
-   `GET /history.php`: Fetches the combined event log.
-   `GET /statistics.php`: Fetches aggregated data for charts. Accepts a `period` parameter (`monthly`, `quarterly`, `annually`).
-   `GET /user_management.php`: Fetches a list of all users.
-   `PUT /user_management.php`: Updates or deletes a user based on an `action` in the payload.
-   `POST /add_user.php`: Creates a new user.
-   `GET /get_roles.php`: Fetches a list of available user roles.

---

## Future Improvements

-   [ ] **Password Hashing:** Implement robust password hashing (`password_hash` and `password_verify` in PHP) for user accounts.
-   [ ] **Pagination:** Add pagination to tables that may contain a large number of records (History, Part List).
-   [ ] **Advanced Statistics:** Create more dashboard charts, such as part type popularity, user activity, etc.
-   [ ] **User Profile Page:** A dedicated page where users can change their own password.
-   [ ] **Token-Based Authentication (JWT):** Transition from PHP sessions to a stateless JWT-based authentication for better scalability and security.
-   [ ] **Dockerize Application:** Create `Dockerfile` and `docker-compose.yml` to simplify the development setup.
