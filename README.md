# Public Ideas - A Collaborative Idea Platform

**Public Ideas** is a dynamic web application designed for users to submit, browse, vote on, and categorize ideas. It leverages a clean, Material Design 3 inspired interface for a "comfy" and intuitive user experience. All data, including ideas, votes, and tags, is persisted within the browser's `sessionStorage`.

## Core Features

- **Idea Submission:** Users can easily submit new ideas via a text input field and a dedicated "Submit Idea" button. Pressing Enter in the input field also submits the idea.
- **Idea Listing:** Submitted ideas are displayed in a clear, scrollable list.
    - Each idea shows its text, current upvote count, and current downvote count.
    - The list is automatically sorted by the number of upvotes in descending order, bringing the most popular ideas to the top.
- **Edit Idea Text:** Users can modify the text of an existing idea directly in the list. An "Edit" button (pencil icon) enables an inline input field, with "Save" and "Cancel" options.
- **Voting System:**
    - **Upvote:** A green "thumbs up" button allows users to increase an idea's upvote count.
    - **Downvote:** A red "thumbs down" button allows users to increase an idea's separate downvote count.
- **Tagging System:**
    - **Add Tags:** Each idea has an "Add Tag" button (local_offer icon) to help categorize and organize ideas.
    - **Tag Creation:**
        - Clicking "Add Tag" opens a dropdown with a text input for the tag name.
        - A predefined palette of 5 colors appears above the input for users to select a color for *new* tags.
        - Pressing Enter in the tag input saves the tag with its name and chosen color.
    - **Tag Display:** Tags are shown as colored chips on each idea, with the chip's background reflecting the chosen tag color.
    - **Tag Autocomplete:** The tag input field provides autocomplete suggestions from existing tags in the system. Selecting an existing tag reuses its established name and color.
    - **Remove Tags:** Each tag chip has a "cross" (×) icon to remove it from an idea.
- **Remove Idea:** Each idea item has a "cross" (×) icon allowing users to delete the idea from the list.
- **Search Functionality:**
    - A search bar allows users to filter ideas by typing a search term.
    - **Search by Idea Text:** Filters ideas based on their content.
    - **Search by Tags:** Filters ideas if the search term matches any of their tag names.
    - **Debounced Input:** Search is performed after a short delay (300ms) to avoid excessive filtering while typing.
    - **Clear Search:** A "cross" (×) icon button allows users to quickly clear the search term and reset the filter.
- **Dynamic UI:**
    - The "Submitted Ideas" section is only visible if there are ideas to display.
    - Vote counts are displayed directly within the upvote/downvote buttons.
- **Session Persistence:** All ideas, their vote counts, and their tags (including names and colors) are saved to `sessionStorage`, so they persist as long as the browser tab is open or until the session is cleared.

## Design & UX Highlights

- **Material Design 3 Inspired:** The application follows Material 3 design principles for a modern, expressive, and minimalist aesthetic.
- **"Comfy" UX:** Focus on ease of use with clear visual cues and intuitive interactions.
- **Styling:**
    - Wider list items for better readability.
    - `0.5rem` vertical spacing between list items.
    - Increased contrast for improved accessibility.
    - "Submit Idea" button is visually distinct (Telegram blue) and positioned in the same row as the input field for quick access.
    - Consistent button design across "Submit", "Upvote", and "Downvote" actions.
    - Fast (0.1s) focus transition on the idea text field.

## How to Run the Application

1.  **No Complex Setup Needed:** This is a client-side application built with HTML, CSS, and JavaScript.
2.  **Clone or Download:**
    *   If you have `git` installed, clone the repository:
        ```bash
        git clone https://github.com/yourusername/public-ideas.git # Replace with the actual repo URL if available
        cd public-ideas
        ```
    *   Alternatively, download the project files (typically as a ZIP) and extract them to a folder on your computer.
3.  **Open in Browser:**
    *   Navigate to the `src` directory within the project folder.
    *   Open the `index.html` file directly in your preferred web browser (e.g., Chrome, Firefox, Edge, Safari).

That's it! The application will load, and you can start submitting and managing ideas.

## Technologies Used

*   **HTML5:** For the basic structure of the application.
*   **CSS3:** For styling, including custom Material Design 3 inspired rules.
    *   Materialize CSS (or its principles) for icons and basic layout components.
*   **JavaScript (ES6+):** For all application logic, DOM manipulation, event handling, and `sessionStorage` interaction.

## Future Enhancements (Potential)

*   User accounts and cloud-based persistence (e.g., Firebase, Supabase).
*   More advanced sorting options (e.g., by date, by downvotes).

## Contributing

Contributions, issues, and feature requests are welcome! Please feel free to submit a pull request or open an issue if you have suggestions or find bugs.