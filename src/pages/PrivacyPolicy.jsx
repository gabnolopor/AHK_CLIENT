import React from 'react';
import { Link } from 'react-router-dom';
import { IoMdHome } from 'react-icons/io';
import { motion } from 'framer-motion';
import { PRIVACY_POLICY_SECTIONS } from '../config/privacyPolicyContent';
import '../styles/bio.css';
import '../styles/privacy.css';

function PrivacyPolicy() {
  return (
    <div className="bio__container privacy-page">
      <motion.div
        className="bio__content-wrapper privacy-page__content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bio__header">
          <Link to="/" className="home-button" aria-label="Home">
            <IoMdHome />
          </Link>
          <h1>Privacy Policy</h1>
          <span className="privacy-page__header-spacer" aria-hidden="true" />
        </div>

        <div className="bio__text-content privacy-page__text">
          {PRIVACY_POLICY_SECTIONS.map((section, sectionIndex) => (
            <section key={section.title} className="privacy-page__section">
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <motion.p
                  key={`${section.title}-${paragraphIndex}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: sectionIndex * 0.05 + paragraphIndex * 0.03 }}
                >
                  {paragraph}
                </motion.p>
              ))}
            </section>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default PrivacyPolicy;
