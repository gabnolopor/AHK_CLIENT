import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandPage from './pages/LandPage';
import BoxSelect from './pages/BoxSelect';
import MusicPage from './pages/MusicPage';
import TestApi from './components/TestApi';
import ComingSoon from './pages/ComingSoon';
import Design from './components/Design';
import Biography from './pages/Biography';
import Credits from './pages/Credits';
import PhotoRoom from './pages/Photoroom';
import ArtRoom from './pages/ArtRoom';
import Writings from './pages/Writings';
import Admin from './pages/Admin';
import PrivateRoute from './components/PrivateRoute';
import TextContentPage from "./components/TextContentPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandPage />} />
        <Route path="/boxselect" element={<BoxSelect />} />
        <Route path="/music" element={<MusicPage />} />
        <Route path="/testapi" element={<TestApi />} />
        <Route path="/comingsoon" element={<ComingSoon />} />
        <Route path="/design" element={<Design />} />
        <Route path="/biography" element={<Biography />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/photoroom" element={<PhotoRoom />} />
        <Route path="/artroom" element={<ArtRoom />} />
        <Route path="/writing" element={<Writings />} />
        <Route path="/admin/login" element={<Admin />} />
        <Route 
          path="/admin" 
          element={
            <PrivateRoute>
              <Admin />
            </PrivateRoute>
          } 
        />
       <Route path="/text-content" element={<TextContentPage />} />


      </Routes>
    </Router>
  );
}

export default App;
