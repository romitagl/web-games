# Word Association Challenge 🧠

An interactive vocabulary learning game that helps improve English word knowledge through definition matching challenges.

## 🎮 How to Play

1. **Choose Your Level**: Select from Easy, Medium, or Hard difficulty
2. **Pick a Category**: General, Academic, or Business vocabulary
3. **Read the Word**: Study the word and its pronunciation
4. **Select Definition**: Choose the correct definition from 4 options
5. **Get Feedback**: Learn from correct answers and mistakes
6. **Build Your Streak**: Chain correct answers for bonus points!

## 🌟 Features

### Game Mechanics

- **Smart Word Selection**: Prioritizes unplayed words, then reviews missed words 2x more frequently
- **Progress Tracking**: Cookie-based storage (1-year retention) tracks completed words, accuracy, and statistics
- **Adaptive Difficulty**: Multiple difficulty levels with category-specific vocabulary
- **Streak System**: Bonus points for consecutive correct answers with level progression every 5 correct answers

### User Experience

- **Mobile-First Design**: Optimized for iOS and Android with touch-friendly interfaces
- **Responsive Layout**: Works seamlessly on phones, tablets, and desktop
- **Accessibility**: Screen reader support, keyboard navigation, and high contrast mode
- **Dark Mode**: Automatic dark theme support based on system preferences
- **Offline Ready**: All game logic runs in browser with no server dependencies

### Statistics & Progress

- **Detailed Stats**: Track total score, best streak, accuracy percentage, and games played
- **Word-Level Tracking**: Individual word accuracy and missed word repetition
- **Progress Visualization**: See completion percentage per category and difficulty
- **Privacy-Friendly**: All data stored locally using cookies, no external tracking

## 🏗️ Technical Architecture

### File Structure

```bash
word-association-challenge/
├── index.html              # Main game interface
├── css/
│   └── main.css            # Mobile-first responsive styles
├── js/
│   ├── game.js             # Main game logic and UI controller
│   ├── storage.js          # Cookie-based progress management
│   └── words.js            # Word database and selection logic
├── data/
│   ├── easy/
│   │   ├── general.json    # Easy general vocabulary
│   │   ├── academic.json   # Easy academic terms
│   │   └── business.json   # Easy business vocabulary
│   ├── medium/             # Medium difficulty words
│   └── hard/               # Hard difficulty words
└── README.md
```

### Core Classes

#### StorageManager (`storage.js`)

- Cookie-based persistence with 1-year expiration
- Tracks completed words, missed words, accuracy, and user preferences
- Provides privacy-compliant local storage with reset capabilities
- Handles statistics calculation and progress export

#### WordManager (`words.js`)

- Loads vocabulary from JSON files organized by difficulty and category
- Implements smart selection: unplayed words (3x weight) → missed words (2x weight) → all words
- Prevents repetition of recently used words (tracks last 5)
- Provides progress analytics per category/difficulty

#### WordAssociationGame (`game.js`)

- Main game controller coordinating storage and word management
- Handles UI interactions, animations, and feedback
- Manages scoring system with difficulty-based points and streak bonuses
- Provides modal interfaces for settings, progress, and statistics

### Word Database Schema

Each JSON file contains:

```json
{
  "category": "general",
  "difficulty": "easy", 
  "words": [
    {
      "word": "Happy",
      "pronunciation": "/ˈhæp.i/",
      "correct_definition": "Feeling joy or pleasure",
      "incorrect_options": [
        "Feeling tired and sleepy",
        "Feeling angry or upset", 
        "Feeling confused or lost"
      ]
    }
  ]
}
```

## 🛠️ Development

### Adding New Words

1. Create/edit JSON files in `data/{difficulty}/{category}.json`
2. Follow the established schema with word, pronunciation, correct definition, and 3 incorrect options
3. Test with various difficulty levels to ensure appropriate challenge

### Customizing Categories

1. Add new category JSON files to difficulty folders
2. Update `availableCategories` array in `words.js`
3. Add category option to HTML select element

### Extending Features

The modular architecture supports easy extension:

- **New Game Modes**: Extend `WordAssociationGame` class
- **Additional Storage**: Expand `StorageManager` with new data types  
- **Enhanced Analytics**: Add methods to track additional metrics
- **UI Themes**: CSS custom properties support easy theme switching

## 📄 License

This project is part of the web-games collection. See main repository for license details.

---

**Live Demo**: [Play Word Association Challenge](https://web-games.romitagl.com/word-association-challenge/)

**Report Issues**: [GitHub Issues](https://github.com/romitagl/web-games/issues)
