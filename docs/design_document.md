# Design Document: Enhancing Enosx AI Capabilities

## 1. Introduction

This document outlines the proposed enhancements to the Enosx AI project, focusing on improving GitHub editing and connection capabilities, expanding browser interaction, and ensuring consistent AI identity and branding. The goal is to evolve Enosx AI into a more powerful and versatile assistant capable of complex development and web-based tasks.

## 2. AI Identity and Branding

**Current State:**

The AI is consistently referred to as "ENOSX AI" or "EX" and is associated with "Enosx Technologies" and `enosxtechnologies450.vercel.app`. This branding is present in:

*   `/home/ubuntu/jjjjj/api-server/src/routes/chat.ts` (SYSTEM_PROMPT)
*   `/home/ubuntu/jjjjj/enosx-app/src/components/WelcomeScreen.tsx` (Visual branding, "EX" logo, "ENOSX AI" greeting)
*   `/home/ubuntu/jjjjj/enosx-app/src/pages/AboutPage.tsx` (Project description, founder details, "ENOSX AI" title)

**Proposed Enhancements:**

No significant changes are required for the core identity. The existing branding is strong and consistent. We will ensure that any new features or UI elements introduced maintain this established identity.

## 3. Enhanced GitHub Editing and Connection Capabilities

**Current State:**

The `useGitHub.ts` hook (`/home/ubuntu/jjjjj/enosx-app/src/hooks/useGitHub.ts`) provides a robust foundation for GitHub interaction, including:

*   Multi-account management
*   Repository and branch selection
*   File browsing (`browseDirectory`, `selectFile`)
*   File content update (`updateFileContent`, `pushChanges`)
*   File creation (`createFile`)

**Proposed Enhancements:**

To further enhance GitHub capabilities, we will focus on expanding file manipulation and introducing pull request management.

### 3.1. Granular File Operations

**Objective:** Allow the AI to perform more detailed file system operations within a selected GitHub repository.

**Changes to `useGitHub.ts`:**

*   **`deleteFile(path: string, commitMessage: string): Promise<boolean>`:**
    *   **Description:** Deletes a specified file from the current repository.
    *   **API Endpoint:** `DELETE /repos/{owner}/{repo}/contents/{path}`
    *   **Parameters:** `path` (file to delete), `message` (commit message), `sha` (blob SHA of the file to delete).
*   **`renameFile(oldPath: string, newPath: string, commitMessage: string): Promise<boolean>`:**
    *   **Description:** Renames a file within the current repository. This is typically a two-step process: create new file with new content, then delete old file.
    *   **API Endpoint:** `PUT /repos/{owner}/{repo}/contents/{newPath}` (create new file), `DELETE /repos/{owner}/{repo}/contents/{oldPath}` (delete old file).
    *   **Parameters:** `oldPath`, `newPath`, `message`, `content` (of the old file), `sha` (of the old file).
*   **`createDirectory(path: string, commitMessage: string): Promise<boolean>`:**
    *   **Description:** Creates a new directory. GitHub API doesn't directly support creating empty directories. This will involve creating a dummy file inside the new directory and then potentially deleting it, or simply creating a file with the desired path.
    *   **API Endpoint:** `PUT /repos/{owner}/{repo}/contents/{path}/.gitkeep` (or similar dummy file).

### 3.2. Pull Request Management

**Objective:** Enable the AI to create and manage pull requests, facilitating collaborative development workflows.

**Changes to `useGitHub.ts`:**

*   **`createPullRequest(title: string, head: string, base: string, body?: string): Promise<any>`:**
    *   **Description:** Creates a new pull request.
    *   **API Endpoint:** `POST /repos/{owner}/{repo}/pulls`
    *   **Parameters:** `title`, `head` (branch with changes), `base` (branch to merge into), `body` (description).
*   **`getPullRequests(state: 'open' | 'closed' | 'all'): Promise<any[]>`:**
    *   **Description:** Fetches a list of pull requests for the current repository.
    *   **API Endpoint:** `GET /repos/{owner}/{repo}/pulls`
    *   **Parameters:** `state` (open, closed, or all).

## 4. Enhanced Browser Capabilities

**Current State:**

The `SYSTEM_PROMPT` in `/home/ubuntu/jjjjj/api-server/src/routes/chat.ts` indicates support for `open_url` and `launch_app` actions. This implies a basic level of external application control.

**Proposed Enhancements:**

To provide more sophisticated browser interaction, we will introduce capabilities for web content extraction and interaction.

### 4.1. Web Content Extraction

**Objective:** Allow the AI to extract structured data and text from web pages.

**Changes to `SYSTEM_PROMPT` (in `chat.ts`):**

Add new action types:

*   **`[[ACTION: {"type": "read_webpage", "url": "https://example.com", "selector": "css_selector"}]]`**
    *   **Description:** Reads content from a specified URL. Optionally, a CSS selector can be provided to extract specific elements. If no selector, it extracts the main text content.
*   **`[[ACTION: {"type": "extract_links", "url": "https://example.com"}]]`**
    *   **Description:** Extracts all hyperlinks from a given URL.

**Implementation Details (Backend `api-server`):**

*   The `api-server` will need to implement a new service or integrate with an existing library (e.g., Puppeteer/Playwright if running headless browser, or a simple HTTP client with a parsing library like Cheerio/BeautifulSoup for static content) to perform these actions.
*   This service will navigate to the specified URL, execute the extraction logic, and return the results to the AI.

### 4.2. Web Interaction

**Objective:** Enable the AI to interact with web elements, such as clicking buttons and filling forms.

**Changes to `SYSTEM_PROMPT` (in `chat.ts`):**

Add new action types:

*   **`[[ACTION: {"type": "click_element", "url": "https://example.com", "selector": "css_selector"}]]`**
    *   **Description:** Navigates to the URL and clicks the element identified by the CSS selector.
*   **`[[ACTION: {"type": "fill_form", "url": "https://example.com", "fields": [{"selector": "css_selector", "value": "text"}]}]]`**
    *   **Description:** Navigates to the URL and fills specified form fields with provided values.

**Implementation Details (Backend `api-server`):**

*   Similar to web content extraction, this will require a headless browser solution (Puppeteer/Playwright) on the backend to simulate user interactions.
*   The backend service will receive the action, execute it in the headless browser, and report success or failure.

## 5. Integration with AI Reasoning

All new capabilities will be integrated into the AI's reasoning process by updating the `SYSTEM_PROMPT` with clear instructions on when and how to use these new actions. The AI will be guided to use these tools strategically to achieve user goals related to GitHub management and web interaction.

## 6. Next Steps

1.  **Refine Design:** Review and refine the proposed API endpoints and data structures.
2.  **Implement Backend Services:** Develop the necessary backend logic in the `api-server` to support the new GitHub and browser actions.
3.  **Update Frontend Hooks:** Modify `useGitHub.ts` and potentially create a new `useBrowser.ts` hook to expose these capabilities to the frontend.
4.  **Update AI Prompt:** Integrate the new actions into the `SYSTEM_PROMPT` to enable the AI to utilize them.
5.  **Testing:** Thoroughly test all new functionalities.
