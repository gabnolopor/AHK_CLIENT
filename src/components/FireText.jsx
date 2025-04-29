import React, { useCallback } from 'react';
import Particles from "react-tsparticles";
import { loadFirePreset } from "tsparticles-preset-fire";
import '../styles/fireText.css';

const FireText = ({ text, isVisible }) => {
  const particlesInit = useCallback(async (engine) => {
    await loadFirePreset(engine);
  }, []);

  // Siempre mostramos el texto, pero solo las partículas cuando isVisible es true
  return (
    <div className={`fire-text-wrapper ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="fire-text">{text}</div>
      {isVisible && (
        <Particles
          className="fire-particles"
          init={particlesInit}
          options={{
            preset: "fire",
            particles: {
              number: {
                value: 70,
                density: {
                  enable: true,
                  value_area: 800
                }
              },
              color: {
                value: ["#fdcf58", "#757676", "#f27d0c", "#800909", "#f07f13"]
              },
              opacity: {
                value: 0.9,
                random: true
              },
              size: {
                value: 5,
                random: true
              },
              move: {
                enable: true,
                speed: 8,
                direction: "top",
                random: true,
                straight: false,
                outMode: "out"
              }
            },
            background: {
              opacity: 0
            },
            detectRetina: true
          }}
        />
      )}
    </div>
  );
};

export default FireText;