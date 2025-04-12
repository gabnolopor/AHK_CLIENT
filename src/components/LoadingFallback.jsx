import Lottie from 'lottie-react';
import loadingAnimation from '../assets/hand-loading.json';
import '../styles/loadingFallback.css';

function LoadingFallback() {
  return (
    <div className="loading-container">
      <div className="loading-animation">
        <Lottie 
          animationData={loadingAnimation}
          loop={true}
          autoplay={true}
          style={{ 
            width: 300,
            height: 300
          }}
          rendererSettings={{
            preserveAspectRatio: 'xMidYMid slice'
          }}
        />
      </div>
    </div>
  );
}

export default LoadingFallback;
