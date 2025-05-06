# Void Scanner

## Astronomical Anomaly Detection System

*Current Version: 1.0.0 (May 6, 2025)*

Void Scanner is a modern web application designed to help astronomers and researchers analyze and classify astronomical images, with a focus on detecting and categorizing anomalies in celestial data.

## Features

- 🔭 **Anomaly Detection**: Automatic identification of unusual or interesting patterns in astronomical images
- 🌌 **Tinder-style Interface**: Quick and intuitive image review and classification
- 🧠 **User Feedback Collection**: Aggregates expert insights to improve machine learning models
- 📊 **Statistics Dashboard**: Track system performance and anomaly distributions
- 🔄 **Sync Capabilities**: Import pre-calculated anomaly detection data from external sources
- 🎮 **Demo Mode**: Practice with sample anomalies before working with real data
- ⌨️ **Keyboard Navigation**: Efficient workflow with keyboard shortcuts

## Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm or yarn
- Backend service running (see [Backend Setup](#backend-setup))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/void_scanner.git
   cd void_scanner
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following content:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```
   Adjust the URL to match your backend service endpoint.

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage

### Anomaly Review Interface

The main interface provides a Tinder-style experience for evaluating astronomical anomalies:

- **Left Swipe / Left Arrow Key**: Mark anomaly as "Not Interesting"
- **Right Swipe / Right Arrow Key**: Mark anomaly as "Interesting"
- **Down Swipe / Down Arrow Key**: Add detailed feedback about the anomaly

### Demo Mode

If no anomalies are detected or you're not connected to the backend, you can use Demo Mode to practice with sample anomalies.

1. Click "Start Demo Mode" on the empty state screen
2. Review sample anomalies to familiarize yourself with the interface
3. Exit Demo Mode when ready to work with real data

### Synchronizing Data

To import pre-calculated anomaly detection data:

1. Click the "Sync Data" button in the interface header
2. Wait for the sync process to complete
3. New anomalies will be available for review

## Deployment

### Deploying to Vercel

This project is configured for easy deployment on Vercel:

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Log in to [Vercel](https://vercel.com) and create a new project

3. Import your Git repository

4. Configure the following environment variables in the Vercel project settings:
   ```
   NEXT_PUBLIC_API_URL=https://your-api-endpoint.com
   ```

5. Deploy! Vercel will automatically build and deploy your application

6. After deployment, you can configure custom domains and other settings in the Vercel dashboard

### Manual Deployment

If you prefer to deploy manually:

1. Build the application:
   ```bash
   npm run build
   # or
   yarn build
   ```

2. Start the production server:
   ```bash
   npm run start
   # or
   yarn start
   ```

## Backend Setup

This frontend application requires a backend service implementing the OpenAPI specification defined in `openapi.json`. For development purposes, you can:

1. Review the API specification:
   ```bash
   cat openapi.json
   ```

2. Set up a compatible backend service or use the provided test server (if available).

## Architecture

Void Scanner is built with:

- **Next.js**: React framework with server-side rendering and routing
- **TypeScript**: For type safety and better developer experience
- **Tailwind CSS**: For responsive and customizable UI components

Key components:

- `TinderStyleAnomalyView`: Main interface for reviewing anomalies with swipe actions
- `AnomalyDashboard`: Overview of detected anomalies and statistics
- `FeedbackForm`: Detailed input form for anomaly classification
- `anomalyService`: API communication with backend services

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- NASA for TESS (Transiting Exoplanet Survey Satellite) data examples
- ESA/Hubble for sample astronomical imagery
- The astronomical community for guidance on anomaly classification standards

---

*Made with ❤️ for astronomical discovery*
