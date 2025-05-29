const ideas = []; // Initialize ideas array
// let currentEditingIdeaIndex = -1; // REPLACED with currentEditingIdeaId
let currentEditingIdeaId = null; // To track which idea is being tagged, using ID now
let currentEditingTextForIdeaId = null; // To track which idea's text is being edited
let tagDropdownEl = null; // To hold the tag dropdown element
let tagInputEl = null; // To hold the tag input element inside the dropdown
let tagColorPaletteEl = null; // To hold the color palette element
let searchInputEl = null; // To hold the search input element
let clearSearchBtnEl = null; // To hold the clear search button
let currentSearchTerm = ''; // To store the current search term

const PREDEFINED_TAG_COLORS = ['#FFAB91', '#FFE082', '#A5D6A7', '#81D4FA', '#CE93D8']; // 5 predefined colors (pastel)
const DEFAULT_TAG_COLOR = '#E0E0E0'; // Default color for new tags
let newTagSelectedColor = DEFAULT_TAG_COLOR; // Color selected for a new tag during creation
let uniqueTagsCache = null; // Cache for getAllUniqueTagsWithColor

// Debounce function
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    loadIdeasFromSession();

    const ideaInputGlobalEl = document.getElementById('ideaInput');
    const submitButton = document.getElementById('submitIdea');
    const ideasListEl = document.getElementById('ideasList');
    const submittedIdeasSectionEl = document.getElementById('submittedIdeasSection');
    tagDropdownEl = document.getElementById('tagDropdown');
    tagInputEl = document.getElementById('tagInput');
    const tagAutocompleteSuggestionsEl = document.getElementById('tagAutocompleteSuggestions');
    tagColorPaletteEl = document.getElementById('tagColorPalette'); // Get the palette element
    searchInputEl = document.getElementById('searchInput');
    clearSearchBtnEl = document.getElementById('clearSearchBtn');

    submitButton.addEventListener('click', () => {
        if (currentEditingTextForIdeaId) { // Implicitly cancel text edit if submitting a new idea
            currentEditingTextForIdeaId = null;
        }
        const ideaText = ideaInputGlobalEl.value.trim();
        if (ideaText) {
            const newIdea = {
                id: Date.now().toString(), // Add unique ID
                text: ideaText,
                upvotes: 0,
                downvotes: 0,
                tags: [] // Tags will be objects: { name: "tagName", color: "#hex" }
            };
            ideas.push(newIdea);
            ideaInputGlobalEl.value = '';
            saveIdeasToSession();
            renderIdeas();
        }
    });

    ideaInputGlobalEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default Enter key action (e.g., newline in textarea or form submission)
            submitButton.click(); // Programmatically click the submit button
        }
    });

    ideasListEl.addEventListener('click', (event) => {
        const target = event.target;
        // Updated selector to include the new remove-idea-btn and edit buttons
        const ideaActionTarget = target.closest(
            'a.btn[data-id], a.btn-flat[data-id], .remove-tag-icon, .remove-idea-btn, .edit-idea-btn, .save-idea-edit-btn, .cancel-idea-edit-btn'
        );

        if (!ideaActionTarget) return;

        let ideaId;
        // Determine ideaId based on the actual clicked element or its relevant parent
        if (ideaActionTarget.classList.contains('remove-tag-icon')) {
            const tagsContainer = ideaActionTarget.closest('.tags-container');
            if (tagsContainer) {
                ideaId = tagsContainer.dataset.id; // Get ID from tags container
            }
        } else if (ideaActionTarget.dataset.id) { // This covers upvote, downvote, add-tag-btn
            ideaId = ideaActionTarget.dataset.id;
        }

        if (ideaId === undefined) {
            console.warn('Could not determine idea ID for the clicked action target:', ideaActionTarget);
            return; // If no ID can be found, exit.
        }

        const idea = ideas.find(i => i.id === ideaId);

        // Validate idea to prevent errors
        if (!idea) {
            console.warn('Invalid or out-of-bounds ideaId:', ideaId, 'or idea does not exist.');
            return; // If idea doesn't exist, exit.
        }

        // Action handling
        if (ideaActionTarget.classList.contains('upvote')) {
            if (currentEditingTextForIdeaId) { currentEditingTextForIdeaId = null; }
            idea.upvotes = (idea.upvotes || 0) + 1;
            saveIdeasToSession();
            renderIdeas();
        } else if (ideaActionTarget.classList.contains('downvote')) {
            if (currentEditingTextForIdeaId) { currentEditingTextForIdeaId = null; }
            idea.downvotes = (idea.downvotes || 0) + 1;
            saveIdeasToSession();
            renderIdeas();
        } else if (ideaActionTarget.classList.contains('add-tag-btn')) {
            // If text editing is active, implicitly cancel it before opening tag editor.
            // The visual change will happen on the next render (e.g., after tag is applied or dialog closed).
            if (currentEditingTextForIdeaId) {
                currentEditingTextForIdeaId = null;
            }
            currentEditingIdeaId = idea.id; // Store ID of the idea being edited FOR TAGS
            newTagSelectedColor = DEFAULT_TAG_COLOR; // Reset to default for new tag creation

            const rect = ideaActionTarget.getBoundingClientRect();
            tagDropdownEl.style.top = `${window.scrollY + rect.bottom}px`;
            tagDropdownEl.style.left = `${window.scrollX + rect.left}px`;
            tagDropdownEl.style.display = 'block';

            // Show color palette for new tag creation, anchored to the input field itself
            populateAndShowCreationColorPalette(tagInputEl);

            tagInputEl.value = '';
            tagAutocompleteSuggestionsEl.innerHTML = '';
            tagAutocompleteSuggestionsEl.style.display = 'none';
            tagInputEl.focus();
            // Return because save/render happens upon actual tag application, not here.
            return;
        } else if (ideaActionTarget.classList.contains('remove-tag-icon')) {
            if (currentEditingTextForIdeaId) { currentEditingTextForIdeaId = null; }
            const tagToRemoveName = ideaActionTarget.dataset.tagText;
            // Ensure tags array exists before trying to filter
            if (idea.tags && tagToRemoveName) {
                idea.tags = idea.tags.filter(tag => tag.name !== tagToRemoveName);
                uniqueTagsCache = null; // Invalidate cache
                saveIdeasToSession();
                renderIdeas();
            }
        } else if (ideaActionTarget.classList.contains('remove-idea-btn')) {
            if (currentEditingTextForIdeaId) { currentEditingTextForIdeaId = null; }
            const ideaIndexToRemove = ideas.findIndex(i => i.id === ideaId);
            if (ideaIndexToRemove > -1) {
                ideas.splice(ideaIndexToRemove, 1);
                saveIdeasToSession();
                renderIdeas();
            }
        } else if (ideaActionTarget.classList.contains('edit-idea-btn')) {
            const ideaIdToEdit = ideaActionTarget.dataset.id;
            // Close tag dropdown if it's open
            if (tagDropdownEl.style.display === 'block') {
                tagDropdownEl.style.display = 'none';
                tagColorPaletteEl.style.display = 'none';
                tagAutocompleteSuggestionsEl.innerHTML = '';
                tagAutocompleteSuggestionsEl.style.display = 'none';
                currentEditingIdeaId = null; // Reset tag editing state
                newTagSelectedColor = DEFAULT_TAG_COLOR;
            }
            currentEditingTextForIdeaId = ideaIdToEdit;
            renderIdeas();
        } else if (ideaActionTarget.classList.contains('save-idea-edit-btn')) {
            const ideaIdToSave = ideaActionTarget.dataset.id;
            const ideaToSave = ideas.find(i => i.id === ideaIdToSave);
            if (ideaToSave) {
                const ideaItemEl = document.getElementById('idea-' + ideaIdToSave);
                const editInputEl = ideaItemEl.querySelector('.edit-idea-input');
                if (editInputEl) {
                    const newText = editInputEl.value.trim();
                    if (newText === "") {
                        // If new text is empty, cancel edit (idea text remains unchanged)
                        console.warn("Idea text cannot be empty. Edit cancelled.");
                    } else {
                        ideaToSave.text = newText;
                    }
                }
            }
            currentEditingTextForIdeaId = null;
            saveIdeasToSession();
            renderIdeas();
        } else if (ideaActionTarget.classList.contains('cancel-idea-edit-btn')) {
            currentEditingTextForIdeaId = null;
            renderIdeas();
        }
        // Note: General saveIdeasToSession() and renderIdeas() calls are removed from the end of this listener.
        // Each branch that modifies data now handles its own saving and rendering.
        // The 'add-tag-btn' branch explicitly returns before any such general call would occur.
    });

    searchInputEl.addEventListener('input', debounce(() => {
        currentSearchTerm = searchInputEl.value.trim().toLowerCase();
        clearSearchBtnEl.style.display = currentSearchTerm ? 'inline-block' : 'none';
        renderIdeas();
    }, 300));

    clearSearchBtnEl.addEventListener('click', () => {
        searchInputEl.value = '';
        currentSearchTerm = '';
        clearSearchBtnEl.style.display = 'none';
        renderIdeas();
        searchInputEl.focus();
    });

    function populateAndShowCreationColorPalette(anchorInputElement) { // Changed parameter name
        tagColorPaletteEl.innerHTML = ''; // Clear previous swatches
        PREDEFINED_TAG_COLORS.forEach(color => {
            const swatch = document.createElement('div');
            swatch.classList.add('color-swatch');
            if (color === newTagSelectedColor) { // Highlight if it's the current default/selected
                swatch.classList.add('selected-swatch');
            }
            swatch.style.backgroundColor = color;
            swatch.addEventListener('click', (e) => {
                e.stopPropagation();
                newTagSelectedColor = color;
                // Visually update selected swatch
                const allSwatches = tagColorPaletteEl.querySelectorAll('.color-swatch');
                allSwatches.forEach(s => s.classList.remove('selected-swatch'));
                swatch.classList.add('selected-swatch');
                // Don't close palette or apply tag here, just select color
            });
            tagColorPaletteEl.appendChild(swatch);
        });

        const inputRect = anchorInputElement.getBoundingClientRect();
        tagColorPaletteEl.style.display = 'flex'; // Make visible first to measure its height accurately
        const paletteHeight = tagColorPaletteEl.offsetHeight;

        // Position palette above the tag input field
        tagColorPaletteEl.style.top = `${window.scrollY + inputRect.top - paletteHeight - 5}px`; // 5px gap above
        tagColorPaletteEl.style.left = `${window.scrollX + inputRect.left}px`;
        tagColorPaletteEl.style.minWidth = `${inputRect.width}px`; // Match width of input
        tagColorPaletteEl.style.boxSizing = 'border-box'; // Ensure padding/border are included in width calculation
    }

    // Function to apply a tag to the currently editing idea
    function applyTagToCurrentIdea(tagName, colorForTag = newTagSelectedColor) {
        if (tagName && currentEditingIdeaId !== null) {
            const ideaToTag = ideas.find(i => i.id === currentEditingIdeaId);
            if (ideaToTag) {
                // Check if tag already exists by name
                if (!ideaToTag.tags.some(tag => tag.name === tagName)) {
                    ideaToTag.tags.push({ name: tagName, color: colorForTag }); // Use provided/selected color
                    uniqueTagsCache = null; // Invalidate cache
                    saveIdeasToSession();
                    renderIdeas();
                }
                tagInputEl.value = '';
                tagDropdownEl.style.display = 'none';
                tagColorPaletteEl.style.display = 'none'; // Hide color palette as well
                tagAutocompleteSuggestionsEl.innerHTML = '';
                tagAutocompleteSuggestionsEl.style.display = 'none';
                currentEditingIdeaId = null;
                newTagSelectedColor = DEFAULT_TAG_COLOR; // Reset for next time
            } else {
                console.warn("Could not find idea with ID:", currentEditingIdeaId, "to apply tag.");
                // Reset UI anyway
                tagInputEl.value = '';
                tagDropdownEl.style.display = 'none';
                tagColorPaletteEl.style.display = 'none';
                tagAutocompleteSuggestionsEl.innerHTML = '';
                tagAutocompleteSuggestionsEl.style.display = 'none';
                currentEditingIdeaId = null;
                newTagSelectedColor = DEFAULT_TAG_COLOR;
            }
        } else if (currentEditingIdeaId !== null) { // Just closing dropdown
            tagInputEl.value = '';
            tagDropdownEl.style.display = 'none';
            tagColorPaletteEl.style.display = 'none'; // Hide color palette as well
            tagAutocompleteSuggestionsEl.innerHTML = '';
            tagAutocompleteSuggestionsEl.style.display = 'none';
            currentEditingIdeaId = null;
            newTagSelectedColor = DEFAULT_TAG_COLOR; // Reset
        }
    }

    tagInputEl.addEventListener('input', debounce(() => { // Added debounce here
        const inputValue = tagInputEl.value.trim();
        if (inputValue === '') {
            tagAutocompleteSuggestionsEl.innerHTML = '';
            tagAutocompleteSuggestionsEl.style.display = 'none';
            return;
        }

        const uniqueTagsWithColor = getAllUniqueTagsWithColor(); // Get tags with their colors
        let filteredTags = uniqueTagsWithColor.filter(tag =>
            tag.name.toLowerCase().startsWith(inputValue.toLowerCase()) &&
            tag.name.toLowerCase() !== inputValue.toLowerCase() // Avoid suggesting exact match if already typed
        );

        filteredTags = filteredTags.slice(0, 5); // Show top 5 matching tags only

        tagAutocompleteSuggestionsEl.innerHTML = '';
        if (filteredTags.length > 0) {
            filteredTags.forEach(tag => { // Iterate over tag objects {name, color}
                const suggestionDiv = document.createElement('div');
                suggestionDiv.classList.add('autocomplete-suggestion');
                
                const colorCircle = document.createElement('span');
                colorCircle.classList.add('autocomplete-tag-color-circle');
                colorCircle.style.backgroundColor = tag.color;
                suggestionDiv.appendChild(colorCircle);

                const tagNameSpan = document.createElement('span');
                tagNameSpan.textContent = tag.name;
                suggestionDiv.appendChild(tagNameSpan);

                suggestionDiv.addEventListener('click', () => {
                    // When an autocomplete suggestion is clicked, apply it with its original color
                    applyTagToCurrentIdea(tag.name, tag.color); 
                });
                tagAutocompleteSuggestionsEl.appendChild(suggestionDiv);
            });
            tagAutocompleteSuggestionsEl.style.display = 'block';
        } else {
            tagAutocompleteSuggestionsEl.style.display = 'none';
        }
    }, 300)); // Debounce time of 300ms

    tagInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const tagName = tagInputEl.value.trim();
            // When Enter is pressed for a new tag, use the color selected from the creation palette
            applyTagToCurrentIdea(tagName, newTagSelectedColor); 
        } else if (e.key === 'Escape') {
            tagDropdownEl.style.display = 'none';
            tagColorPaletteEl.style.display = 'none'; // Also hide creation color palette
            tagAutocompleteSuggestionsEl.innerHTML = '';
            tagAutocompleteSuggestionsEl.style.display = 'none';
            currentEditingIdeaId = null;
        }
    });

    // Close dropdown if clicked outside
    document.addEventListener('click', (event) => {
        const clickedAddTagButton = event.target.closest('.add-tag-btn');
        // const clickedColorCircleOrTag = event.target.closest('.tag-color-circle, .tag-chip > span:not(.remove-tag-icon)'); // No longer needed for this logic
        const isPaletteClick = tagColorPaletteEl.contains(event.target);
        const isDropdownClick = tagDropdownEl.contains(event.target);

        // Close new tag input + associated color palette
        if (tagDropdownEl.style.display === 'block' && 
            !isDropdownClick && 
            !isPaletteClick && 
            !clickedAddTagButton) {
            
            tagDropdownEl.style.display = 'none';
            tagColorPaletteEl.style.display = 'none'; // Hide associated palette
            tagAutocompleteSuggestionsEl.innerHTML = '';
            tagAutocompleteSuggestionsEl.style.display = 'none';
            // currentEditingIdeaId = null; // Reset if dropdown closes
            newTagSelectedColor = DEFAULT_TAG_COLOR;
        }

        // REMOVED: Logic for closing palette specifically for existing tag color editing
        // if (tagColorPaletteEl.style.display === 'flex' &&
        //     !tagDropdownEl.contains(event.target) && 
        //     !isPaletteClick &&
        //     !clickedColorCircleOrTag && 
        //     !event.target.closest('.tag-chip')) {
            
        //     if (currentEditingTag !== null) { 
        //          tagColorPaletteEl.style.display = 'none';
        //          currentEditingIdeaIndex = null; 
        //          currentEditingTag = null;
        //     }
        // }
    });

    function createIdeaElement(idea) {
        const ideaItem = document.createElement('li');
        ideaItem.className = 'collection-item';
        ideaItem.id = 'idea-' + idea.id;

        const mainDiv = document.createElement('div');
        mainDiv.style.display = 'flex';
        mainDiv.style.flexDirection = 'column';
        mainDiv.style.width = '100%';

        if (idea.id === currentEditingTextForIdeaId) {
            // EDIT MODE
            mainDiv.innerHTML = ''; // Clear for edit mode structure

            const editInputContainer = document.createElement('div');
            editInputContainer.className = 'edit-idea-input-container';
            
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'edit-idea-input';
            editInput.value = idea.text;
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'save-idea-edit-btn btn waves-effect waves-light green';
            saveBtn.dataset.id = idea.id;
            saveBtn.textContent = 'Save';
            saveBtn.style.marginRight = '5px';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'cancel-idea-edit-btn btn-flat waves-effect';
            cancelBtn.dataset.id = idea.id;
            cancelBtn.textContent = 'Cancel';

            editInputContainer.appendChild(editInput);
            editInputContainer.appendChild(saveBtn);
            editInputContainer.appendChild(cancelBtn);
            mainDiv.appendChild(editInputContainer);
            ideaItem.appendChild(mainDiv);

            setTimeout(() => editInput.focus(), 0); // Autofocus after element is in DOM
        } else {
            // DISPLAY MODE
            const topRowDiv = document.createElement('div');
            topRowDiv.style.display = 'flex';
            topRowDiv.style.justifyContent = 'space-between';
            topRowDiv.style.alignItems = 'center';
            topRowDiv.style.width = '100%';

            const ideaTextSpan = document.createElement('span');
            ideaTextSpan.className = 'idea-text';
            ideaTextSpan.textContent = idea.text;
            topRowDiv.appendChild(ideaTextSpan);

            const secondaryContentDiv = document.createElement('div');
            secondaryContentDiv.className = 'secondary-content';
            secondaryContentDiv.style.display = 'flex';
            secondaryContentDiv.style.alignItems = 'center';

            // Edit Button (New for display mode)
            const editBtn = document.createElement('a');
            editBtn.href = '#!';
            editBtn.className = 'edit-idea-btn btn-flat waves-effect waves-circle';
            editBtn.dataset.id = idea.id;
            editBtn.title = 'Edit Idea';
            editBtn.style.marginRight = '8px';
            editBtn.style.padding = '0 5px';
            const editIconEl = document.createElement('i'); // Renamed to avoid conflict
            editIconEl.className = 'material-icons grey-text text-darken-1';
            editIconEl.textContent = 'edit';
            editBtn.appendChild(editIconEl);
            secondaryContentDiv.appendChild(editBtn); // Add Edit button first

            // Add Tag Button
            const addTagBtn = document.createElement('a');
            addTagBtn.href = '#!';
            addTagBtn.className = 'add-tag-btn btn-flat waves-effect waves-circle';
            addTagBtn.dataset.id = idea.id;
            addTagBtn.title = 'Add Tags';
            addTagBtn.style.marginRight = '8px';
            addTagBtn.style.padding = '0 5px';
            const addTagIcon = document.createElement('i');
            addTagIcon.className = 'material-icons grey-text text-darken-1';
            addTagIcon.textContent = 'local_offer';
            addTagBtn.appendChild(addTagIcon);
            secondaryContentDiv.appendChild(addTagBtn);

            // Upvote Button
            const upvoteBtn = document.createElement('a');
            upvoteBtn.href = '#!';
            upvoteBtn.className = 'upvote btn btn-small waves-effect waves-light green';
            upvoteBtn.dataset.id = idea.id;
            upvoteBtn.style.marginRight = '5px';
            const upvoteIcon = document.createElement('i');
            upvoteIcon.className = 'material-icons left';
            upvoteIcon.textContent = 'thumb_up';
            upvoteBtn.appendChild(upvoteIcon);
            upvoteBtn.appendChild(document.createTextNode(idea.upvotes || 0));
            secondaryContentDiv.appendChild(upvoteBtn);

            // Downvote Button
            const downvoteBtn = document.createElement('a');
            downvoteBtn.href = '#!';
            downvoteBtn.className = 'downvote btn btn-small waves-effect waves-light red';
            downvoteBtn.dataset.id = idea.id;
            // downvoteBtn.style.marginRight = '8px'; // Keep some margin if remove button is next to it
            const downvoteIcon = document.createElement('i');
            downvoteIcon.className = 'material-icons left';
            downvoteIcon.textContent = 'thumb_down';
            downvoteBtn.appendChild(downvoteIcon);
            downvoteBtn.appendChild(document.createTextNode(idea.downvotes || 0));
            secondaryContentDiv.appendChild(downvoteBtn);

            // Remove Idea Button
            const removeIdeaBtn = document.createElement('a');
            removeIdeaBtn.href = '#!';
            removeIdeaBtn.className = 'remove-idea-btn btn-flat waves-effect waves-circle'; // Using btn-flat for a less prominent look
            removeIdeaBtn.dataset.id = idea.id;
            removeIdeaBtn.title = 'Remove Idea';
            removeIdeaBtn.style.marginLeft = '8px'; // Add some space from the downvote button
            removeIdeaBtn.style.padding = '0 5px'; 
            const removeIcon = document.createElement('i');
            removeIcon.className = 'material-icons grey-text text-darken-1'; // Consistent with add-tag icon
            removeIcon.textContent = 'close'; // 'close' or 'delete' are common icons
            removeIdeaBtn.appendChild(removeIcon);
            secondaryContentDiv.appendChild(removeIdeaBtn); // Add to secondary content

            topRowDiv.appendChild(secondaryContentDiv);
            mainDiv.appendChild(topRowDiv);

            // Tags Area
            if (idea.tags && idea.tags.length > 0) {
                const tagsContainer = document.createElement('div');
                tagsContainer.className = 'tags-container';
                tagsContainer.dataset.id = idea.id; // For remove-tag-icon to find its idea
                tagsContainer.style.marginTop = '8px';

                idea.tags.forEach(tag => {
                    const tagChip = document.createElement('span');
                    tagChip.className = 'tag-chip';
                    tagChip.dataset.tagName = tag.name;
                    tagChip.style.backgroundColor = tag.color || DEFAULT_TAG_COLOR;

                    // const tagColorCircle = document.createElement('span');
                    // tagColorCircle.className = 'tag-color-circle';
                    // tagColorCircle.style.backgroundColor = tag.color || DEFAULT_TAG_COLOR;
                    // tagChip.appendChild(tagColorCircle);
                    
                    const tagNameSpan = document.createElement('span');
                    tagNameSpan.style.marginLeft = '5px';
                    tagNameSpan.textContent = tag.name;
                    tagChip.appendChild(tagNameSpan);
                    
                    tagChip.appendChild(document.createTextNode(' ')); // &nbsp;

                    const removeTagIcon = document.createElement('span');
                    removeTagIcon.className = 'remove-tag-icon';
                    removeTagIcon.dataset.tagText = tag.name;
                    removeTagIcon.innerHTML = '&times;'; // Using innerHTML for the times symbol
                    tagChip.appendChild(removeTagIcon);
                    
                    tagsContainer.appendChild(tagChip);
                });
                mainDiv.appendChild(tagsContainer);
            }
        }

        ideaItem.appendChild(mainDiv);
        return ideaItem;
    }

    function renderIdeas() {
        ideasListEl.innerHTML = ''; // Still clearing for now, future optimization can target this
        
        let ideasToRender = ideas;
        if (currentSearchTerm) {
            ideasToRender = ideas.filter(idea => {
                const ideaTextMatch = idea.text.toLowerCase().includes(currentSearchTerm);
                const tagMatch = idea.tags.some(tag => tag.name.toLowerCase().includes(currentSearchTerm));
                return ideaTextMatch || tagMatch;
            });
        }

        submittedIdeasSectionEl.style.display = ideas.length > 0 ? 'block' : 'none'; // Show section if ANY ideas exist, regardless of filter
        
        // If search yields no results, but ideas exist, show a message or handle appropriately.
        // For now, it will render an empty list if search term doesn't match anything.

        const sortedIdeas = [...ideasToRender].sort((a, b) => b.upvotes - a.upvotes);
        sortedIdeas.forEach(idea => {
            // const originalIndex = ideas.findIndex(i => i === idea); // No longer needed
            const ideaElement = createIdeaElement(idea);
            ideasListEl.appendChild(ideaElement);
        });
    }

    function saveIdeasToSession() {
        sessionStorage.setItem('publicIdeas', JSON.stringify(ideas));
    }

    function loadIdeasFromSession() {
        const storedIdeas = sessionStorage.getItem('publicIdeas');
        if (storedIdeas) {
            const parsedIdeas = JSON.parse(storedIdeas);
            ideas.length = 0; // Clear existing ideas before loading
            parsedIdeas.forEach(idea => {
                ideas.push({
                    id: idea.id || Date.now().toString() + Math.random(), // Ensure ID exists, add randomness for old data
                    text: idea.text,
                    upvotes: idea.upvotes || 0,
                    downvotes: idea.downvotes || 0,
                    tags: (idea.tags || []).map(tag => // Ensure tags are objects with color
                        typeof tag === 'string' ? { name: tag, color: DEFAULT_TAG_COLOR } : tag
                    )
                });
            });
        }
    }

    // REMOVED getAllUniqueTagNames() as it's no longer used.
    // function getAllUniqueTagNames() { 
    //     const allTagNames = ideas.flatMap(idea => idea.tags.map(tag => tag.name));
    //     return [...new Set(allTagNames)];
    // }

    function getAllUniqueTagsWithColor() {
        if (uniqueTagsCache) {
            return uniqueTagsCache;
        }
        const uniqueTags = new Map(); // Use a Map to store unique tags by name, preserving their first encountered color
        ideas.forEach(idea => {
            idea.tags.forEach(tag => {
                if (!uniqueTags.has(tag.name)) {
                    uniqueTags.set(tag.name, { name: tag.name, color: tag.color });
                }
            });
        });
        uniqueTagsCache = Array.from(uniqueTags.values());
        return uniqueTagsCache;
    }

    renderIdeas(); // Initial render
});