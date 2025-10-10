<script>
  import { onMount } from 'svelte';
  
  let textareaElement;
  let importTextarea;
  let symbolsTextarea;
  let previewElement;
  let gridData = Array(11 * 14).fill(' ');
  let rows = 11;
  let cols = 14;
  let activeRow = null;
  let activeCol = null;
  let previewASCII = '';
  let updateCounter = 0; // Force reactivity by changing this value
  let commonSymbols = 'abcdefghijklmnopqrstuvwxyz1234567890--=+_)(*&^%$#@!|}{;:\'"?.>,<■□▢▣▤▥▦▧▨▩▪▫▬▭▮▯▰▱▲△▴▵▶▷▸▹►▻▼▽▾▿◀◁◂◃◄◅◆◇◈◉◊○◌◍◎●◐◑◒◓◔◕◖◗◘◙◚◛◜◝◞◟◠◡◢◣◤◥◦◧◨◩◪◫◬◭◮◯◰◱◲◳◴◵◶◷◸◹◺◻◼◽◾◿';
  let selectedSymbol = '■'; // Default selected symbol
  let isPainting = false; // Track if we're in painting mode
  let isErasing = false; // Track if we're in erasing mode
  
  // Get cell index from row/col
  function getCellIndex(row, col) {
    return row * cols + col;
  }

  function escapeString(str) {
    return str
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/"/g, '\\"')    // Escape double quotes
      .replace(/'/g, "\\'");   // Escape single quotes
  }
  
  // Update the textarea
  function updateTextarea() {
    if (textareaElement) {
      let lines = [];
      for (let i = 0; i < rows; i++) {
        let line = '';
        for (let j = 0; j < cols; j++) {
          line += gridData[getCellIndex(i, j)];
        }
        lines.push(line);
      }
      // Escape the entire string before joining with \n
      let escapedOutput = lines.map(line => escapeString(line)).join('\\n');
      textareaElement.value = escapedOutput;
    }
  }
  
  
  // Update the ASCII preview
  function updatePreview() {
    // Generate the ASCII preview
    let lines = [];
    for (let i = 0; i < rows; i++) {
      let line = '';
      for (let j = 0; j < cols; j++) {
        line += gridData[getCellIndex(i, j)];
      }
      lines.push(line);
    }
    previewASCII = lines.join('\n');
    
    // Update the preview DOM element if it exists
    if (previewElement) {
      previewElement.textContent = previewASCII;
    }
  }
  
  // Get cell content directly from DOM
  function updateCellDOM(row, col, char) {
    const cellElement = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
    if (cellElement) {
      cellElement.textContent = char;
    }
  }
  
  // Set the active cell
  function setActiveCell(row, col) {
    // Clear previous active cell styling
    if (activeRow !== null && activeCol !== null) {
      const prevElement = document.querySelector(`.grid-cell[data-row="${activeRow}"][data-col="${activeCol}"]`);
      if (prevElement) {
        prevElement.classList.remove('active');
      }
    }
    
    activeRow = row;
    activeCol = col;
    
    // Add active styling to new cell
    const newElement = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
    if (newElement) {
      newElement.classList.add('active');
    }
  }
  
  // Handle a cell click
  function handleCellClick(event, row, col) {
    setActiveCell(row, col);
    
    // If right mouse button was clicked (button 2), erase the cell
    if (event.button === 2) {
      setCellChar(row, col, ' ');
      // Start erasing mode
      isErasing = true;
    } else {
      // Otherwise paint with the selected symbol when clicking
      setCellChar(row, col, selectedSymbol);
      // Start painting mode
      isPainting = true;
    }
  }
  
  // Handle mouse enter event on a cell (for painting/erasing)
  function handleCellMouseEnter(row, col) {
    if (isPainting) {
      // Paint the selected symbol when dragging
      setCellChar(row, col, selectedSymbol);
    } else if (isErasing) {
      // Erase when dragging with right button held
      setCellChar(row, col, ' ');
    }
  }
  
  // Handle mouse up event (to stop painting/erasing)
  function handleMouseUp() {
    isPainting = false;
    isErasing = false;
  }
  
  // Set a cell's character
  function setCellChar(row, col, char) {
    const index = getCellIndex(row, col);
    gridData[index] = char;
    
    // Update the DOM directly
    updateCellDOM(row, col, char);
    
    // Update the textarea and preview
    updateTextarea();
    updatePreview();
    
    // Force reactivity (as a backup)
    updateCounter++;
  }
  
  // Handle key presses
  function handleKeyDown(event) {
    if (activeRow !== null && activeCol !== null) {
      // Navigation keys
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setActiveCell(activeRow, Math.min(activeCol + 1, cols - 1));
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setActiveCell(activeRow, Math.max(activeCol - 1, 0));
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveCell(Math.min(activeRow + 1, rows - 1), activeCol);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveCell(Math.max(activeRow - 1, 0), activeCol);
      }
      // Input keys (single character)
      else if (event.key.length === 1) {
        event.preventDefault();
        setCellChar(activeRow, activeCol, event.key);
        // Move to next cell
        setActiveCell(activeRow, Math.min(activeCol + 1, cols - 1));
      }
      // Space bar
      else if (event.key === ' ') {
        event.preventDefault();
        setCellChar(activeRow, activeCol, ' ');
        // Move to next cell
        setActiveCell(activeRow, Math.min(activeCol + 1, cols - 1));
      }
      // Backspace/Delete
      else if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        setCellChar(activeRow, activeCol, ' ');
      }
      // Tab
      else if (event.key === 'Tab') {
        event.preventDefault();
        if (event.shiftKey) {
          // Move left or to the end of the previous row
          if (activeCol > 0) {
            setActiveCell(activeRow, activeCol - 1);
          } else if (activeRow > 0) {
            setActiveCell(activeRow - 1, cols - 1);
          }
        } else {
          // Move right or to the beginning of the next row
          if (activeCol < cols - 1) {
            setActiveCell(activeRow, activeCol + 1);
          } else if (activeRow < rows - 1) {
            setActiveCell(activeRow + 1, 0);
          }
        }
      }
    }
  }
  
  // Clear the grid
  function clearGrid() {
    // Reset the data
    gridData = Array(rows * cols).fill(' ');
    
    // Update all cells in the DOM
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        updateCellDOM(row, col, ' ');
      }
    }
    
    // Update the textarea and preview
    updateTextarea();
    updatePreview();
    
    // Force reactivity
    updateCounter++;
  }
  
// Unescape quotes and backslashes in a string
  function unescapeString(str) {
    return str
      .replace(/\\'/g, "'")    // Unescape single quotes
      .replace(/\\"/g, '"')    // Unescape double quotes
      .replace(/\\\\/g, '\\'); // Unescape backslashes last
  }
  
  // Process string with escaped newlines into the grid
  function processImportString() {
    if (!importTextarea || !importTextarea.value) return;
    
    // Split by escaped newlines
    const lines = importTextarea.value.split('\\n');
    
    // Create a new grid
    let newGrid = Array(rows * cols).fill(' ');
    
    // Fill the grid with the imported data
    for (let row = 0; row < rows && row < lines.length; row++) {
      // Unescape the line before processing
      const line = unescapeString(lines[row]);
      for (let col = 0; col < cols && col < line.length; col++) {
        newGrid[getCellIndex(row, col)] = line[col];
      }
    }
    
    // Update grid data
    gridData = newGrid;
    
    // Update the DOM cells
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        updateCellDOM(row, col, gridData[getCellIndex(row, col)]);
      }
    }
    
    // Update the textarea and preview
    updateTextarea();
    updatePreview();
    
    // Force reactivity
    updateCounter++;
  }
  
  // Process plain text with actual newlines into the grid
  function processPlainText() {
    if (!importTextarea || !importTextarea.value) return;
    
    // Split by actual newlines
    const lines = importTextarea.value.split(/\r?\n/);
    
    // Create a new grid
    let newGrid = Array(rows * cols).fill(' ');
    
    // Fill the grid with the imported data
    for (let row = 0; row < rows && row < lines.length; row++) {
      const line = lines[row];
      for (let col = 0; col < cols && col < line.length; col++) {
        newGrid[getCellIndex(row, col)] = line[col];
      }
    }
    
    // Update grid data
    gridData = newGrid;
    
    // Update the DOM cells
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        updateCellDOM(row, col, gridData[getCellIndex(row, col)]);
      }
    }
    
    // Update the textarea and preview
    updateTextarea();
    updatePreview();
    
    // Force reactivity
    updateCounter++;
  }
  
  // Handle symbol button click
  function handleSymbolClick(symbol) {
    // Set the selected symbol
    selectedSymbol = symbol;
    
    // Update the currently active cell if there is one
    if (activeRow !== null && activeCol !== null) {
      setCellChar(activeRow, activeCol, symbol);
    }
  }
  
  // Add custom symbols to palette
  function addCustomSymbols() {
    if (!symbolsTextarea || !symbolsTextarea.value) return;
    
    // Add to the common symbols
    commonSymbols += symbolsTextarea.value;
    
    // Clear the textarea
    symbolsTextarea.value = '';
    
    // Force reactivity
    updateCounter++;
  }
  
  function handleGlobalClick(event) {
    if (!event.target.classList.contains('grid-cell')) {
      // Clear previous active cell
      if (activeRow !== null && activeCol !== null) {
        const prevElement = document.querySelector(`.grid-cell[data-row="${activeRow}"][data-col="${activeCol}"]`);
        if (prevElement) {
          prevElement.classList.remove('active');
        }
      }
      activeRow = null;
      activeCol = null;
    }
  }
  
  // Prevent context menu from appearing on right-click in grid
  function handleContextMenu(event) {
    // Prevent the context menu if this is within the grid
    if (event.target.classList.contains('grid-cell')) {
      event.preventDefault();
    }
  }
  
  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    
    // Initialize the preview and textarea
    updatePreview();
    updateTextarea();
    
    // Add note about right-click erase feature
    const container = document.querySelector('.container');
    if (container) {
      const instructions = document.createElement('div');
      instructions.className = 'instructions';
      instructions.textContent = 'Left click to draw, right click to erase. Click and drag to paint/erase multiple cells.';
      container.insertBefore(instructions, container.firstChild.nextSibling);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  });
</script>

<div class="container">
  <h2>ASCII editor</h2> 
  <!-- Instructions will be inserted here by JS -->
  
  <!-- Import Section -->
  <div class="import-section">
    <!-- <h3>Import ASCII Art</h3> -->
    <textarea 
      bind:this={importTextarea} 
      placeholder="Paste your ASCII art here... (either with actual line breaks or with escaped \n)"
      rows="5"
    ></textarea>
    <div class="import-buttons">
      <button class="import-button" on:click={processImportString}>Import Escaped String (with \n)</button>
      <button class="import-button" on:click={processPlainText}>Import Plain Text</button>
    </div>
  </div>
  
  <!-- Symbols Section -->
  <div class="symbols-section">
    <!-- <h3>Symbol Palette</h3> -->
    <div class="symbol-palette">
      {#each commonSymbols as symbol}
        <button class="symbol-button {selectedSymbol === symbol ? 'selected' : ''}" on:click={() => handleSymbolClick(symbol)}>{symbol}</button>
      {/each}
    </div>
  </div>
    <!-- Symbol Selection Status -->
  <div class="symbol-status">
    <span>Currently selected: </span>
    <span class="selected-symbol">{selectedSymbol}</span>
  </div>
  
  <div class="main-editor">
    <div class="editor-wrapper">
      <!-- Column numbers -->
      <div class="col-numbers">
        {#each Array(cols) as _, i}
          <div class="col-number">{i + 1}</div>
        {/each}
      </div>
      
      <!-- Grid with row numbers -->
      <div class="grid-with-numbers">
        <div class="row-numbers">
          {#each Array(rows) as _, i}
            <div class="row-number">{i + 1}</div>
          {/each}
        </div>
        
        <div class="grid">
          {#each Array(rows) as _, row}
            <div class="grid-row">
              {#each Array(cols) as _, col}
                <!-- Using data attributes for direct DOM access -->
                <div 
                  class="grid-cell" 
                  data-row={row} 
                  data-col={col}
                  on:mousedown={(event) => handleCellClick(event, row, col)}
                  on:mouseenter={() => handleCellMouseEnter(row, col)}
                >{gridData[getCellIndex(row, col)]}</div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    </div>
    
    <!-- ASCII Preview Section -->
    <div class="preview-wrapper">
      <!-- <h3>Preview</h3> -->
      <div class="preview-container">
        <!-- Use bind:this to get a reference to the element -->
        <pre bind:this={previewElement} class="ascii-preview">{previewASCII}</pre>
      </div>
    </div>
  </div>
  
  <div class="output-container">
    <h3>Output with escaped newlines:</h3>
    <textarea bind:this={textareaElement} readonly rows="5"></textarea>
    <button class="clear-button" on:click={clearGrid}>Clear Grid</button>
  </div>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
  }
  
  h2, h3 {
    text-align: center;
    margin-bottom: 10px;
  }
  
  .instructions {
    text-align: center;
    margin-bottom: 10px;
    color: #fff;
    padding: 5px;
    background-color: #f0f0f0;
    border-radius: 4px;
    font-style: italic;
  }
  
  .symbol-status {
    text-align: center;
    margin-bottom: 20px;
    padding: 5px;
    background-color: var(--bg-color);
    border-radius: 4px;
/*     border: 1px solid #ddd; */
  }
  
  .selected-symbol {
    display: inline-block;
    width: 30px;
    height: 30px;
    line-height: 30px;
    text-align: center;
    font-family: monospace;
    font-size: 18px;
    background-color: #e9e9e9;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-left: 5px;
  }
  
  .import-section, .symbols-section {
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .import-section textarea, .symbols-section textarea {
    width: 100%;
    font-family: monospace;
    padding: 10px;
    border: 1px solid #999;
    resize: vertical;
  }
  
  .import-buttons, .custom-symbols {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }
  
  .import-button, .add-symbols-button {
    padding: 8px 16px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .import-button:hover, .add-symbols-button:hover {
    background-color: #45a049;
  }
  
  .symbol-palette {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin: 10px 0;
/*     max-height: 200px; */
    overflow-y: auto;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 100%;
  }
  
  .symbol-button {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: monospace;
    font-size: 18px;
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .symbol-button:hover {
    background-color: #e0e0e0;
  }
  
  .symbol-button.selected {
    background-color: #d4edda;
    border-color: #28a745;
    box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
  }
  
  .main-editor {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    color: white;
  }
  
  .editor-wrapper {
    margin: 0;
    padding-left: 30px; /* Space for row numbers */
    position: relative;
  }
  
  .col-numbers {
    display: flex;
    margin-left: 0px;
  }
  
  .col-number {
    width: 30px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: #666;
  }
  
  .grid-with-numbers {
    display: flex;
    position: relative;
  }
  
  .row-numbers {
    position: absolute;
    left: -30px;
    top: 0;
    display: flex;
    flex-direction: column;
  }
  
  .row-number {
    height: 30px;
    width: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: #666;
  }
  
  .grid {
    display: flex;
    flex-direction: column;
    border: 2px solid #333;
    outline: none;
  }
  
  .grid-row {
    display: flex;
  }
  
  .grid-cell {
    width: 30px;
    height: 30px;
    border: 1px solid rgba(255,255,255,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: monospace;
    font-size: 20px;
    cursor: crosshair;
    background-color: var(--bg-color);
    user-select: none;
  }
  
  .grid-cell.active {
    background-color: #e0f0ff;
    border: 1px solid #0066cc;
    box-shadow: 0 0 3px #0066cc;
  }
  
  .grid-cell:hover {
    background-color: #e9e9e9;
  }
  
  .preview-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }
  
  .preview-container {
    width: 60px;
    height: 60px;
    border: 2px solid #333;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-color);
    overflow: hidden;
    padding: 0;
  }
  
  .ascii-preview {
    font-family: "Lucida Console", Monaco, monospace;
    font-size: 5.2px;
    line-height: .6;
    white-space: pre;
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    letter-spacing: normal;
  }
  
  .output-container {
    width: 100%;
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .output-container textarea {
    width: 100%;
    font-family: monospace;
    padding: 10px;
    border: 1px solid #999;
    resize: vertical;
    margin-bottom: 15px;
  }
  
  .clear-button {
    padding: 8px 16px;
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .clear-button:hover {
    background-color: #d32f2f;
  }
  
  .custom-symbols {
    width: 100%;
    display: flex;
    gap: 10px;
  }
  
  .custom-symbols textarea {
    flex-grow: 1;
  }

</style>
