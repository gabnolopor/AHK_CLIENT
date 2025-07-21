import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LandPage from './pages/LandPage';
import MusicPage from './pages/MusicPage';
import TestApi from './components/TestApi';
import ComingSoon from './pages/ComingSoon';
import Design from './components/Design';
import Biography from './pages/Biography';
import Credits from './pages/Credits';
import PhotoRoom from './pages/PhotoRoom';
import ArtRoom from './pages/ArtRoom';
import Writings from './pages/Writings';
import Admin from './pages/Admin';
import PrivateRoute from './components/PrivateRoute';
import TextContentPage from "./components/TextContentPage";
import DigitalArt from './pages/DigitalArt';
import NotFound from './pages/NotFound';
import PDFViewer from './components/PDFViewer';
import ThreeDRoom from './pages/3DRoom';
import Photo3DRoom from './pages/Photo3DRoom';
import LoadingFallback from './components/LoadingFallback';

// Component to handle loading logic based on current route
function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const isRootRoute = location.pathname === '/';

  useEffect(() => {
    // Skip loading for root route
    if (isRootRoute) {
      setIsLoading(false);
      return;
    }

    // Simulate app loading time for other routes
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isRootRoute]);

  return (
    <>
      {isLoading && !isRootRoute && <LoadingFallback onLoadingComplete={() => setIsLoading(false)} />}
      <Routes>
        <Route path="/" element={<LandPage />} />
        <Route path="/music" element={<MusicPage />} />
        <Route path="/testapi" element={<TestApi />} />
        <Route path="/comingsoon" element={<ComingSoon />} />
        <Route path="/design" element={<Design />} />
        <Route path="/biography" element={<Biography />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/photoroom" element={<PhotoRoom />} />
        <Route path="/artroom" element={<ArtRoom />} />
        <Route path="/writing" element={<Writings />} />
        <Route path="/digitalart" element={<DigitalArt />} />
        <Route path="/admin/login" element={<Admin />} />
        <Route path="/3dRoom" element={<ThreeDRoom />} />
        <Route path="/photo3DRoom" element={<Photo3DRoom />} />
        <Route 
          path="/admin" 
          element={
            <PrivateRoute>
              <Admin />
            </PrivateRoute>
          } 
        />
       <Route path="/text-content" element={<TextContentPage />} />
       <Route path="/pdf-viewer" element={<PDFViewer />} />
       <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
