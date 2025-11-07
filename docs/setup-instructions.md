# Setup & Development Instructions

This guide explains how to set up the WatchTracker project for local development and how to use this documentation for continuity.

## 1. Prerequisites

- **Node.js**: A recent version (e.g., LTS).
- **npm** or **yarn**: A Node.js package manager.
- **Supabase Account**: A free account at [supabase.com](https://supabase.com).

## 2. Local Development Setup

1.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install Dependencies**: The project uses a CDN-based approach with an `importmap`, so a traditional `npm install` for packages like React is not required. However, if a local development server or other tools are added later, this step would be necessary.

3.  **Run the Application**: Since there's no local server specified yet, you can serve the `index.html` file using a simple static server. A common tool for this is `serve`:
    ```bash
    # Install serve globally if you don't have it
    npm install -g serve

    # Run the server from the project root
    serve .
    ```
    The application will be available at the URL provided by the `serve` command (e.g., `http://localhost:3000`).

## 3. Supabase Configuration

The application requires a Supabase project to function.

1.  **Create a Supabase Project**:
    - Go to your Supabase dashboard and create a new project.
    - Save the **Project URL** and the **`anon` (public) key**.

2.  **Set up the Database**:
    - In your Supabase project, go to the **SQL Editor**.
    - Copy the SQL schema from `docs/database-schema.md` and run it to create the `watchlist` table and its constraints.

3.  **Enable Row Level Security (RLS)**:
    - Go to **Authentication -> Policies**.
    - Select the `watchlist` table.
    - Enable RLS for the table.
    - Create the four policies (SELECT, INSERT, UPDATE, DELETE) using the SQL provided in `docs/database-schema.md`.

4.  **Update Client Configuration**:
    - Open the file `services/supabase.ts`.
    - Replace the placeholder values for `supabaseUrl` and `supabaseAnonKey` with the credentials from your Supabase project.

    ```typescript
    // In services/supabase.ts
    const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL';
    const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
    ```

## 4. Development Continuity with AI

This `/docs` folder is the key to seamless, long-term development with an AI assistant.

- **To start a new session**: Provide the AI with the complete contents of all project files, including everything in this `/docs` directory.
- **The AI's role**: The AI will first read the documentation to understand the project's architecture, design rules, feature set, and database schema. This context allows it to make informed decisions and generate code that is consistent with the existing project.
- **Maintaining the docs**: The AI is instructed to automatically update the documentation whenever it makes changes to the code, ensuring the docs never become stale.
