"use client";

import { useState } from "react";

export interface Logo {
  id: string;
  name: string;
  logoURL: string;
}

interface LogoSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  logos: Logo[];
  selectedLogoURL: string | null;
  onSelect: (logo: Logo) => void;
  title: string;
}

const LogoSelectionModal = ({
  isOpen,
  onClose,
  logos,
  selectedLogoURL,
  onSelect,
  title,
}: LogoSelectionModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filteredLogos = logos.filter((logo) =>
    logo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logos..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredLogos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {searchQuery ? "No logos found" : "No logos available. Add logos in the Players tab."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredLogos.map((logo) => {
                const isSelected = logo.logoURL === selectedLogoURL;
                return (
                  <button
                    key={logo.id}
                    onClick={() => {
                      onSelect(logo);
                      onClose();
                    }}
                    className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "bg-blue-50 border-blue-500"
                        : "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center shrink-0">
                      {logo.logoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logo.logoURL}
                          alt={logo.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-2xl text-gray-400">?</span>
                      )}
                    </div>
                    <span className="mt-2 text-sm font-medium text-gray-900 truncate w-full text-center">
                      {logo.name}
                    </span>
                    {isSelected && (
                      <span className="text-xs text-blue-600 font-medium">Selected</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogoSelectionModal;
