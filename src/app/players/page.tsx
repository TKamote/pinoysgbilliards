"use client";

import { useState, useEffect, useRef } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useUsage } from "@/contexts/UsageContext";

interface Player {
  id: string;
  name: string;
  email: string;
  phone: string;
  skillLevel: "beginner" | "intermediate" | "advanced" | "expert";
  rating: number;
  points: number;
  tournamentsPlayed: number;
  wins: number;
  status: "active" | "inactive";
  photoURL?: string;
}

interface Logo {
  id: string;
  name: string;
  logoURL: string;
}

const PlayersPage = () => {
  const { user } = useAuth();
  const { showLimitReachedModal } = useUsage();
  const canEditPlayers = !!user;
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const mountedRef = useRef(true);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const playersCollection = collection(db, "players");
      const playersSnapshot = await getDocs(playersCollection);
      const playersList = playersSnapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          skillLevel: (data.skillLevel ?? "beginner") as Player["skillLevel"],
          rating: typeof data.rating === "number" ? data.rating : 0,
          points: typeof data.points === "number" ? data.points : 0,
          tournamentsPlayed: typeof data.tournamentsPlayed === "number" ? data.tournamentsPlayed : 0,
          wins: typeof data.wins === "number" ? data.wins : 0,
          status: (data.status ?? "active") as Player["status"],
          photoURL: data.photoURL,
        };
      });
      const sorted = playersList.sort((a, b) => b.points - a.points);
      if (mountedRef.current) {
        setPlayers(sorted);
      }
    } catch (error) {
      console.error("Error loading players:", error);
      if (mountedRef.current) {
        setLoadError(error instanceof Error ? error.message : "Failed to load players");
        setPlayers([]);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    loadPlayers();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadLogos = async () => {
    try {
      setLogosLoading(true);
      const logosCollection = collection(db, "logos");
      const snapshot = await getDocs(logosCollection);
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return { id: d.id, name: (data.name ?? "") as string, logoURL: (data.logoURL ?? "") as string };
      });
      setLogos(list.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      console.error("Error loading logos:", e);
      setLogos([]);
    } finally {
      setLogosLoading(false);
    }
  };

  useEffect(() => {
    loadLogos();
  }, []);

  const [logos, setLogos] = useState<Logo[]>([]);
  const [logosLoading, setLogosLoading] = useState(true);
  const [showLogoForm, setShowLogoForm] = useState(false);
  const [editingLogo, setEditingLogo] = useState<Logo | null>(null);
  const [newLogoName, setNewLogoName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [newPlayer, setNewPlayer] = useState({
    name: "",
    points: "",
    skillLevel: "beginner" as
      | "beginner"
      | "intermediate"
      | "advanced"
      | "expert",
    photo: null as File | null,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handleCreatePlayer = async () => {
    // Check for duplicate name
    const duplicateName = players.find(
      (player) => player.name.toLowerCase() === newPlayer.name.toLowerCase()
    );

    if (duplicateName) {
      alert(`Player with name "${newPlayer.name}" already exists!`);
      return;
    }

    try {
      setLoading(true);
      const playerData = {
        name: newPlayer.name,
        email: "", // Default empty email
        phone: "", // Default empty phone
        skillLevel: newPlayer.skillLevel,
        rating: 0, // Not used for ranking, kept for compatibility
        points: Number(newPlayer.points) || 0,
        tournamentsPlayed: 0,
        wins: 0,
        status: "active",
        photoURL: photoPreview || "", // Store preview data URL temporarily
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, "players"), playerData);

      // Update local state with new player including Firestore ID
      const newPlayerWithId: Player = {
        id: docRef.id,
        ...playerData,
        status: "active" as const,
      };

      // Re-sort players after adding (by points descending)
      const updatedPlayers = [...players, newPlayerWithId].sort(
        (a, b) => b.points - a.points
      );
      setPlayers(updatedPlayers);
      setNewPlayer({
        name: "",
        points: "",
        skillLevel: "beginner",
        photo: null,
      });
      setPhotoPreview(null);
      setShowCreateForm(false);
    } catch (error) {
      if ((error as { code?: string })?.code === "permission-denied") {
        showLimitReachedModal();
        return;
      }
      console.error("Error creating player:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert(
        `Failed to create player: ${errorMessage}\n\nCheck the console for more details.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlayer = (player: Player) => {
    if (!canEditPlayers) {
      setShowLoginPrompt(true);
      return;
    }
    console.log("Editing player:", player);
    setEditingPlayer(player);
    setNewPlayer({
      name: player.name,
      points: player.points?.toString() || "",
      skillLevel: player.skillLevel,
      photo: null,
    });
    // Show existing photo if available
    setPhotoPreview(player.photoURL || null);
    setShowCreateForm(true);
  };

  const handleUpdatePlayer = async () => {
    if (editingPlayer) {
      // Check for duplicate name (excluding the current player being edited)
      const duplicateName = players.find(
        (player) =>
          player.name.toLowerCase() === newPlayer.name.toLowerCase() &&
          player.id !== editingPlayer.id
      );

      if (duplicateName) {
        alert(`Player with name "${newPlayer.name}" already exists!`);
        return;
      }

      try {
        setLoading(true);

        // Update in Firestore
        const playerRef = doc(db, "players", editingPlayer.id);
        const updateData: {
          name: string;
          points: number;
          skillLevel: string;
          photoURL?: string;
        } = {
          name: newPlayer.name,
          points: Number(newPlayer.points) || 0,
          skillLevel: newPlayer.skillLevel,
        };

        // Update photoURL - either new photo or remove existing photo
        if (photoPreview) {
          updateData.photoURL = photoPreview;
        } else {
          updateData.photoURL = ""; // Remove photo by setting empty string
        }

        await updateDoc(playerRef, updateData);

        // Update local state
        const updatedPlayers = players.map((player) =>
          player.id === editingPlayer.id
            ? {
                ...player,
                name: newPlayer.name,
                points: Number(newPlayer.points) || 0,
                skillLevel: newPlayer.skillLevel,
                photoURL: photoPreview || "", // Always update photoURL (empty string removes photo)
              }
            : player
        );

        // Re-sort players after updating (by points descending)
        const sortedPlayers = updatedPlayers.sort(
          (a, b) => b.points - a.points
        );
        setPlayers(sortedPlayers);
        setEditingPlayer(null);
        setNewPlayer({
          name: "",
          points: "",
          skillLevel: "beginner",
          photo: null,
        });
        setPhotoPreview(null);
        setShowCreateForm(false);
      } catch (error) {
        if ((error as { code?: string })?.code === "permission-denied") {
          showLimitReachedModal();
          return;
        }
        console.error("Error updating player:", error);
        alert("Failed to update player. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingPlayer(null);
    setNewPlayer({
      name: "",
      points: "",
      skillLevel: "beginner",
      photo: null,
    });
    setPhotoPreview(null);
    setShowCreateForm(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setNewPlayer({
      ...newPlayer,
      photo: file,
    });

    // Create compressed preview URL
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // Resize to max 400x400 (good for profile photos)
          const maxSize = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to compressed data URL (JPEG at 0.7 quality)
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
          setPhotoPreview(compressedDataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  const handleAddPlayerClick = () => {
    if (!canEditPlayers) {
      setShowLoginPrompt(true);
      return;
    }
    setShowCreateForm(true);
  };

  const handleDeletePlayer = async () => {
    if (!editingPlayer) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${editingPlayer.name}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      setLoading(true);

      // Delete from Firestore
      const { deleteDoc } = await import("firebase/firestore");
      const playerRef = doc(db, "players", editingPlayer.id);
      await deleteDoc(playerRef);

      // Update local state
      const updatedPlayers = players.filter((p) => p.id !== editingPlayer.id);
      setPlayers(updatedPlayers);

      setEditingPlayer(null);
      setNewPlayer({
        name: "",
        points: "",
        skillLevel: "beginner",
        photo: null,
      });
      setPhotoPreview(null);
      setShowCreateForm(false);
      alert("Player deleted successfully!");
    } catch (error) {
      if ((error as { code?: string })?.code === "permission-denied") {
        showLimitReachedModal();
        return;
      }
      console.error("Error deleting player:", error);
      alert("Failed to delete player. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setLogoPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxSize = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        setLogoPreview(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = async () => {
    const name = newLogoName.trim();
    if (!name) {
      alert("Please enter a logo name.");
      return;
    }
    try {
      if (editingLogo) {
        const ref = doc(db, "logos", editingLogo.id);
        await updateDoc(ref, { name, logoURL: logoPreview ?? editingLogo.logoURL });
        setLogos((prev) =>
          prev.map((l) => (l.id === editingLogo.id ? { ...l, name, logoURL: logoPreview ?? l.logoURL } : l)).sort((a, b) => a.name.localeCompare(b.name))
        );
      } else {
        const ref = await addDoc(collection(db, "logos"), { name, logoURL: logoPreview ?? "" });
        setLogos((prev) => [...prev, { id: ref.id, name, logoURL: logoPreview ?? "" }].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setShowLogoForm(false);
      setEditingLogo(null);
      setNewLogoName("");
      setLogoPreview(null);
    } catch (e) {
      if ((e as { code?: string })?.code === "permission-denied") {
        showLimitReachedModal();
        return;
      }
      console.error("Error saving logo:", e);
      const msg = e instanceof Error ? e.message : "Failed to save logo.";
      alert(`Failed to save logo. ${msg}`);
    }
  };

  const handleDeleteLogo = async (logo: Logo) => {
    if (!window.confirm(`Delete logo "${logo.name}"?`)) return;
    try {
      await deleteDoc(doc(db, "logos", logo.id));
      setLogos((prev) => prev.filter((l) => l.id !== logo.id));
      if (editingLogo?.id === logo.id) {
        setShowLogoForm(false);
        setEditingLogo(null);
        setNewLogoName("");
        setLogoPreview(null);
      }
    } catch (e) {
      if ((e as { code?: string })?.code === "permission-denied") {
        showLimitReachedModal();
        return;
      }
      console.error("Error deleting logo:", e);
      alert("Failed to delete logo.");
    }
  };

  const handleEditLogo = (logo: Logo) => {
    if (!canEditPlayers) {
      setShowLoginPrompt(true);
      return;
    }
    setEditingLogo(logo);
    setNewLogoName(logo.name);
    setLogoPreview(logo.logoURL || null);
    setShowLogoForm(true);
  };

  const handleAddLogoClick = () => {
    if (!canEditPlayers) {
      setShowLoginPrompt(true);
      return;
    }
    setEditingLogo(null);
    setNewLogoName("");
    setLogoPreview(null);
    setShowLogoForm(true);
  };

  const handleCancelLogoEdit = () => {
    setShowLogoForm(false);
    setEditingLogo(null);
    setNewLogoName("");
    setLogoPreview(null);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Players</h1>
          </div>
          <button
            onClick={handleAddPlayerClick}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-bold transition-colors disabled:opacity-50"
          >
            <span className="text-white font-bold text-2xl mr-2">+</span>
            Add Player
          </button>
        </div>

        {loading && players.length === 0 && !loadError && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading players...</p>
          </div>
        )}

        {loadError && (
          <div className="text-center py-12 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 font-medium mb-2">Could not load players</p>
            <p className="text-sm text-amber-700 mb-4">{loadError}</p>
            <button
              type="button"
              onClick={() => loadPlayers()}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Login Prompt Modal */}
        {showLoginPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="text-center">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-bold mb-2 text-gray-900">
                  Login Required
                </h2>
                <p className="text-gray-600 mb-6">
                  Please log in to add or edit players.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      setShowLoginPrompt(false);
                      window.location.href = "/home";
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Go to Login
                  </button>
                  <button
                    onClick={() => setShowLoginPrompt(false)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Player Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 text-gray-900">
                {editingPlayer ? "Edit Player" : "Add New Player"}
              </h2>

              {/* Profile Photo at Top */}
              {photoPreview && (
                <div className="mb-6 text-center">
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPreview}
                      alt="Player profile"
                      className="w-24 h-24 object-cover rounded-full border-4 border-blue-500 mx-auto"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setNewPlayer({ ...newPlayer, photo: null });
                        setPhotoPreview(null);
                      }}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 shadow-lg"
                      title="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Profile Photo</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Player Photo (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {photoPreview
                      ? "Photo added - see preview above"
                      : "Photo will be saved to Firebase Storage"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Player Name
                  </label>
                  <input
                    type="text"
                    value={newPlayer.name}
                    onChange={(e) => {
                      console.log("Name changing to:", e.target.value);
                      setNewPlayer({ ...newPlayer, name: e.target.value });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    placeholder="Enter player name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points ⭐
                  </label>
                  <input
                    type="number"
                    value={newPlayer.points}
                    onChange={(e) => {
                      setNewPlayer({
                        ...newPlayer,
                        points: e.target.value,
                      });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    placeholder="Enter tournament points"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ranking is determined by points (higher = better)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Skill Level
                  </label>
                  <select
                    value={newPlayer.skillLevel}
                    onChange={(e) =>
                      setNewPlayer({
                        ...newPlayer,
                        skillLevel: e.target.value as
                          | "beginner"
                          | "intermediate"
                          | "advanced"
                          | "expert",
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-between items-center mt-6">
                <div>
                  {editingPlayer && (
                    <button
                      onClick={handleDeletePlayer}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2 font-bold"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleCancelEdit}
                    className="px-2 py-2 text-gray-600 hover:text-gray-800 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={
                      editingPlayer ? handleUpdatePlayer : handleCreatePlayer
                    }
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2 font-bold"
                  >
                    {editingPlayer ? (
                      <>
                        <span className="text-white font-bold">✓</span>
                        Update
                      </>
                    ) : (
                      "Add Player"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search - filter by name (list order unchanged) */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
          <label htmlFor="player-search" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Search players:
          </label>
          <input
            id="player-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type name to search..."
            className="flex-1 max-w-md border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
          />
          {searchQuery.trim() && (
            <span className="text-sm text-gray-600">
              Showing {players.filter((p) => p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())).length} of {players.length} players
            </span>
          )}
        </div>

        {/* Players Table - show when we have data or when not in error state */}
        {(!loadError || players.length > 0) && (() => {
          const displayPlayers = searchQuery.trim()
            ? players.filter((p) =>
                p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
              )
            : players;
          const col1 = displayPlayers.slice(0, 75);
          const col2 = displayPlayers.slice(75, 150);
          const col3 = displayPlayers.slice(150, 225);
          return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Players 1-75 */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Players 1-75
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 text-center text-base font-medium text-gray-500 uppercase tracking-wider w-16">
                      Rank
                    </th>
                    <th className="px-2 py-2 text-center text-base font-medium text-gray-500 uppercase tracking-wider w-16">
                      Photo
                    </th>
                    <th className="px-3 py-2 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                      Players
                    </th>
                    <th className="px-2 py-2 text-center text-base font-medium text-gray-500 uppercase tracking-wider w-20">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {col1.map((player, i) => (
                    <tr
                      key={player.id}
                      className={`transition-colors ${
                        canEditPlayers ? "hover:bg-blue-50 cursor-pointer" : ""
                      }`}
                      onClick={() => handleEditPlayer(player)}
                      title={canEditPlayers ? "Click to edit" : ""}
                    >
                      <td className="px-2 py-2 text-center text-lg font-medium text-gray-900 w-16">
                        #{i + 1}
                      </td>
                      <td className="px-2 py-2 text-center w-16">
                        {player.photoURL ? (
                          <div className="w-8 h-8 mx-auto">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={player.photoURL}
                              alt={player.name}
                              className="w-full h-full object-cover rounded-full border-2 border-blue-400"
                            />
                          </div>
                        ) : (
                          <div className="w-6 h-6 bg-linear-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-sm mx-auto">
                            👤
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-lg text-gray-900">
                        {player.name}
                      </td>
                      <td className="px-2 py-2 text-center text-lg text-gray-900 w-20">
                        {player.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Middle Column - Players 76-150 */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Players 76-150
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 text-center text-base font-medium text-gray-500 uppercase tracking-wider w-16">
                      Rank
                    </th>
                    <th className="px-2 py-2 text-center text-base font-medium text-gray-500 uppercase tracking-wider w-16">
                      Photo
                    </th>
                    <th className="px-3 py-2 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                      Players
                    </th>
                    <th className="px-2 py-2 text-center text-base font-medium text-gray-500 uppercase tracking-wider w-20">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {col2.map((player, i) => (
                    <tr
                      key={player.id}
                      className={`transition-colors ${
                        canEditPlayers ? "hover:bg-blue-50 cursor-pointer" : ""
                      }`}
                      onClick={() => handleEditPlayer(player)}
                      title={canEditPlayers ? "Click to edit" : ""}
                    >
                      <td className="px-2 py-2 text-center text-lg font-medium text-gray-900 w-16">
                        #{i + 76}
                      </td>
                      <td className="px-2 py-2 text-center w-16">
                        {player.photoURL ? (
                          <div className="w-8 h-8 mx-auto">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={player.photoURL}
                              alt={player.name}
                              className="w-full h-full object-cover rounded-full border-2 border-green-400"
                            />
                          </div>
                        ) : (
                          <div className="w-6 h-6 bg-linear-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-sm mx-auto">
                            👤
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-lg text-gray-900">
                        {player.name}
                      </td>
                      <td className="px-2 py-2 text-center text-lg text-gray-900 w-20">
                        {player.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column - Players 151-225 */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Players 151-225
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 text-center text-base font-medium text-gray-500 uppercase tracking-wider w-16">
                      Rank
                    </th>
                    <th className="px-2 py-2 text-center text-base font-medium text-gray-500 uppercase tracking-wider w-16">
                      Photo
                    </th>
                    <th className="px-3 py-2 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                      Players
                    </th>
                    <th className="px-2 py-2 text-center text-base font-medium text-gray-500 uppercase tracking-wider w-20">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {col3.map((player, i) => (
                    <tr
                      key={player.id}
                      className={`transition-colors ${
                        canEditPlayers ? "hover:bg-blue-50 cursor-pointer" : ""
                      }`}
                      onClick={() => handleEditPlayer(player)}
                      title={canEditPlayers ? "Click to edit" : ""}
                    >
                      <td className="px-2 py-2 text-center text-lg font-medium text-gray-900 w-16">
                        #{i + 151}
                      </td>
                      <td className="px-2 py-2 text-center w-16">
                        {player.photoURL ? (
                          <div className="w-8 h-8 mx-auto">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={player.photoURL}
                              alt={player.name}
                              className="w-full h-full object-cover rounded-full border-2 border-purple-400"
                            />
                          </div>
                        ) : (
                          <div className="w-6 h-6 bg-linear-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-sm mx-auto">
                            👤
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-lg text-gray-900">
                        {player.name}
                      </td>
                      <td className="px-2 py-2 text-center text-lg text-gray-900 w-20">
                        {player.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
          );
        })()}

        {!loadError && !loading && players.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No players yet
            </h3>
            <p className="text-gray-600">
              Click &quot;Add Player&quot; to create your first player
            </p>
          </div>
        )}

        {/* Logos section - for use in Tour Manager-4 overlay */}
        <div className="mt-10 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Logos</h3>
            <p className="text-sm text-gray-600">Add logos here; pick them in Tour Manager-4 overlay.</p>
            <button
              onClick={handleAddLogoClick}
              disabled={!canEditPlayers || logosLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 shrink-0"
            >
              Add Logo
            </button>
          </div>
          <div className="p-4">
            {logosLoading ? (
              <p className="text-gray-500 text-sm">Loading logos...</p>
            ) : logos.length === 0 ? (
              <p className="text-gray-500 text-sm">No logos yet. Add a logo to use in Tour Manager-4.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {logos.map((logo) => (
                  <div
                    key={logo.id}
                    className="flex flex-col items-center border border-gray-200 rounded-lg p-2 hover:border-blue-300"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border flex items-center justify-center">
                      {logo.logoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logo.logoURL} alt={logo.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-gray-400 text-xs">No image</span>
                      )}
                    </div>
                    <span className="mt-1 text-sm font-medium text-gray-900 truncate w-full text-center">{logo.name}</span>
                    {canEditPlayers && (
                      <div className="flex gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => handleEditLogo(logo)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLogo(logo)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Logo Modal */}
        {showLogoForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-900">{editingLogo ? "Edit Logo" : "Add Logo"}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newLogoName}
                    onChange={(e) => setNewLogoName(e.target.value)}
                    placeholder="e.g. Team A"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                  {logoPreview && (
                    <div className="mb-2 w-24 h-24 rounded-lg overflow-hidden border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleLogoFile} className="text-sm text-gray-600" />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={handleSaveLogo} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                  Save
                </button>
                <button onClick={handleCancelLogoEdit} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayersPage;
