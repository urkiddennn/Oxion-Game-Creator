# 🌌 Oxion Game Creator

![Oxion Logo](./assets/oxion.png)

**Oxion Game Creator** is a powerful, mobile-first 2D game engine and creation suite built with **React Native**, **Expo**, and **Matter.js**. It empowers creators to design, build, and share professional 2D games directly from their mobile devices without writing a single line of code.

---

## 🚀 Key Features

- **🎮 Visual Logic Editor**: A high-density "No-Code" event system. Create complex game mechanics using a logic-based interface.
- **⚙️ Physics Engine**: Full integration with **Matter.js** for realistic character movement, collisions, and gravity.
- **🎨 Sprite & Animation Editor**: Built-in pixel art tools and frame-based animation state machines.
- **🏗️ Room Designer**: Design multi-layered levels with drag-and-drop objects, tiles, and backgrounds.
- **🖥️ GUI & HUD Builder**: Create interactive user interfaces and heads-up displays that respond to game data.
- **🤝 Community Hub**: Publish your creations to the global gallery and play games made by other creators.
- **📺 Academy**: Integrated tutorial center with in-app video playback and documentation.

---

## 🛠️ Tech Stack

- **Framework**: Expo SDK 55 / React Native 0.83
- **Logic**: TypeScript
- **Backend**: Supabase (Database & Auth)
- **Physics**: Matter.js
- **State Management**: Zustand
- **Animations**: React Native Reanimated

---

## 🏗️ Getting Started

### Prerequisites
- Node.js (LTS v22.x recommended)
- EAS CLI (`npm install -g eas-cli`)
- Expo Go (on your mobile device)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/urkiddennn/Oxion-Game-Creator.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env` file with your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_url
   EXPO_PUBLIC_SUPABASE_KEY=your_key
   ```
4. Start the development server:
   ```bash
   npx expo start
   ```

---

## 🤝 Contributing

We love community contributions! Whether you're fixing bugs, adding features, or creating tutorials, here's how you can help:

### How to Contribute
1. **Fork the Repo**: Create your own copy of the project.
2. **Create a Branch**: `git checkout -b feature/amazing-feature`
3. **Commit Changes**: Use clear, descriptive commit messages.
4. **Push**: `git push origin feature/amazing-feature`
5. **Open a PR**: Submit a Pull Request to the `main` branch.

### Areas for Contribution
- **Engine Core**: Performance optimizations for Matter.js.
- **Logic Blocks**: New event types and actions for the Visual Editor.
- **Tutorials**: Record video guides for the Academy.
- **UI/UX**: Help us make the editor even more professional.

---

## 📜 License
Oxion is licensed under the MIT License. See `LICENSE` for details.

---

*Built with ❤️ for the game dev community by [Urkidden](https://github.com/urkiddennn)*
