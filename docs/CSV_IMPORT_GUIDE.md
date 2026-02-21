  # German Vocabulary & Sentences CSV Import Guide

  This guide explains how to format, interrelate, and import your German vocabulary and sentences using CSV files.

  ## 1. Creating the Vocabulary CSV

  The vocabulary CSV contains the core words you want to learn.
  **Default Location:** `scripts/vocabulary.csv`

  ### Required Structure
  The first line must be the header row with the following exact columns:
  `german,english,part_of_speech,gender,plural,level,frequency_rank`

  ### Rules
  - **german** (Required): The German word (e.g., `Haus`). This must be unique as it acts as the link for sentences.
  - **english** (Required): The English translation (e.g., `house`).
  - **part_of_speech**: `noun`, `verb`, `adjective`, etc. (Defaults to `noun` if empty).
  - **gender**: `der`, `die`, `das` (Leave empty if not applicable).
  - **plural**: The plural form of a noun (e.g., `Häuser`).
  - **level**: CEFR level like `A1`, `A2`, `B1`.
  - **frequency_rank**: An integer representing how common the word is (e.g., `1`).

  ### Example Row
  ```csv
  Haus,house,noun,das,Häuser,A1,14
  ```

  ---

  ## 2. Creating the Sentences CSV

  The sentences CSV contains context-rich sample sentences that teach the vocabulary words.
  **Default Location:** `scripts/sentences.csv`

  ### Required Structure
  The first line must be the header row with the following exact columns:
  `german,english,difficulty_level,vocabulary_words`

  ### Rules
  - **german** (Required): The complete German sentence. Wrap the text in double quotes `""` if the sentence contains commas.
  - **english** (Required): The English translation.
  - **difficulty_level**: CEFR level (e.g., `A1`).
  - **vocabulary_words**: A semicolon-separated list of the base German vocabulary words present in this sentence.

  ### Example Row
  ```csv
  "Das Haus ist neu.",The house is new.,A1,Haus;neu
  ```

  ---

  ## 3. How Vocabulary and Sentences Interrelate

  The system is designed so that sentences reinforce the specific vocabulary you are learning. To create concise, highly relevant sentences, you must interrelate them using the **`vocabulary_words`** column in the sentences CSV.

  ### The Linking Mechanism
  When importing sentences, the database reads the `vocabulary_words` column, splits the words by semicolon (`;`), and matches them exactly against the `german` column in your vocabulary database. 

  For the link to work successfully:
  1. **Exact Match:** If your vocabulary CSV has the base word `Haus` and `neu`, your sentence `vocabulary_words` column must read exactly `Haus;neu`.
  2. **Order of Operation:** The vocabulary word *must* exist in the database before the sentence can link to it. 
  3. **Keep it Concise:** Write short, targeted sentences that feature 1 to 3 vocabulary words at most. Avoid complex grammar unless that matches the user's difficulty level.

  **Workflow for concise creation:**
  1. Pick a few target words: `Katze` (cat) and `klein` (small).
  2. Create a concise sentence: "Die Katze ist klein."
  3. In `sentences.csv`, set the relation: `Katze;klein`

  ---

  ## 4. How to Import the Data

  Once your CSV files are ready and placed in the project root's `scripts/` directory, you can import them into the SQLite database.

  1. Open your terminal and navigate to the `backend` folder:
    ```bash
    cd backend
    ```
  2. **Step 1: Import Vocabulary**
    You **must** run this command first so the base words exist to be linked.
    ```bash
    npm run import:vocab
    ```
    *(This script runs `scripts/import-vocabulary.ts`)*

  3. **Step 2: Import Sentences**
    Run this command second. It will import the sentences and create relational links to the vocabulary words you just imported.
    ```bash
    npm run import:sentences
    ```
    *(This script runs `scripts/import-sentences.ts`)*

  Both scripts will automatically look for `../../scripts/vocabulary.csv` and `../../scripts/sentences.csv` relative to their execution path, or you can pass an explicit path as an        :
  ```bash
  npm run import:vocab ../custom/path/my-vocab.csv
  ```
