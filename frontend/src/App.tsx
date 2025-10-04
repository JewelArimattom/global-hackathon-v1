import { Routes, Route } from 'react-router-dom';
import RecordingStoriesPage from './pages/RecordingStoriesPage';
import Home from "./components/homepage/Home";
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignUpPage';
const NotFound = () => <div className="p-8 text-center min-h-screen"><h1>404 - Page Not Found</h1></div>;

const App = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow bg-gray-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stories" element={<RecordingStoriesPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;