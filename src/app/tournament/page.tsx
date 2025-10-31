"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "@/components/LoginModal";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Tournament {
  id: string;
  name: string;
  date: string;
  status: "upcoming" | "ongoing" | "completed";
  participants: number;
  maxParticipants: number;
  prize: string;
}

const TournamentPage = () => {
  const { signOut, isManager, username } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  // Load tournaments from Firestore on component mount
  useEffect(() => {
    const loadTournaments = async () => {
      try {
        setLoading(true);
        const tournamentsCollection = collection(db, "tournaments");
        const tournamentsSnapshot = await getDocs(tournamentsCollection);
        const tournamentsList = tournamentsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            participants: data.participants || 0,
          };
        }) as Tournament[];
        setTournaments(tournamentsList);
      } catch (error) {
        console.error("Error loading tournaments:", error);
      } finally {
        setLoading(false);
      }
    };
    loadTournaments();
  }, []);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(
    null
  );
  const [newTournament, setNewTournament] = useState({
    name: "",
    date: "",
    maxParticipants: 16,
    prize: "",
  });

  const handleCreateTournament = async () => {
    if (!isManager) {
      setShowLoginModal(true);
      return;
    }

    try {
      const tournamentData = {
        name: newTournament.name,
        date: newTournament.date,
        status: "upcoming" as const,
        participants: 0,
        maxParticipants: newTournament.maxParticipants,
        prize: newTournament.prize,
      };

      // Add to Firestore
      const docRef = await addDoc(
        collection(db, "tournaments"),
        tournamentData
      );

      // Update local state with new tournament including Firestore ID
      const newTournamentWithId: Tournament = {
        id: docRef.id,
        ...tournamentData,
      };

      setTournaments([...tournaments, newTournamentWithId]);
      setNewTournament({ name: "", date: "", maxParticipants: 16, prize: "" });
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error creating tournament:", error);
    }
  };

  const handleEditTournament = (tournament: Tournament) => {
    if (!isManager) {
      setShowLoginModal(true);
      return;
    }
    setEditingTournament(tournament);
    setNewTournament({
      name: tournament.name,
      date: tournament.date,
      maxParticipants: tournament.maxParticipants,
      prize: tournament.prize,
    });
    setShowCreateForm(true);
  };

  const handleUpdateTournament = async () => {
    if (!editingTournament || !isManager) {
      return;
    }

    try {
      const tournamentRef = doc(db, "tournaments", editingTournament.id);
      const updateData = {
        name: newTournament.name,
        date: newTournament.date,
        maxParticipants: newTournament.maxParticipants,
        prize: newTournament.prize,
      };

      await updateDoc(tournamentRef, updateData);

      // Update local state
      const updatedTournaments = tournaments.map((tournament) =>
        tournament.id === editingTournament.id
          ? {
              ...tournament,
              name: newTournament.name,
              date: newTournament.date,
              maxParticipants: newTournament.maxParticipants,
              prize: newTournament.prize,
            }
          : tournament
      );

      setTournaments(updatedTournaments);
      setEditingTournament(null);
      setNewTournament({ name: "", date: "", maxParticipants: 16, prize: "" });
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error updating tournament:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingTournament(null);
    setNewTournament({ name: "", date: "", maxParticipants: 16, prize: "" });
    setShowCreateForm(false);
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    if (!isManager) {
      setShowLoginModal(true);
      return;
    }

    if (window.confirm("Are you sure you want to delete this tournament?")) {
      try {
        await deleteDoc(doc(db, "tournaments", tournamentId));
        setTournaments(tournaments.filter((t) => t.id !== tournamentId));
      } catch (error) {
        console.error("Error deleting tournament:", error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ongoing":
        return "bg-green-100 text-green-800";
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-3 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              🏆 Tournaments
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your billiards tournaments
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {isManager ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  Welcome, {username}
                </span>
                <button
                  onClick={() => signOut()}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg text-sm font-bold transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-sm font-bold transition-colors"
              >
                Manager Login
              </button>
            )}
            {isManager ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-sm font-bold transition-colors w-full sm:w-auto"
              >
                <span className="text-white font-bold text-lg mr-2">+</span>
                Create Tournament
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-sm font-bold transition-colors w-full sm:w-auto"
              >
                <span className="text-white font-bold text-lg mr-2">+</span>
                Create Tournament
              </button>
            )}
          </div>
        </div>

        {/* Create Tournament Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingTournament
                  ? "Edit Tournament"
                  : "Create New Tournament"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tournament Name
                  </label>
                  <input
                    type="text"
                    value={newTournament.name}
                    onChange={(e) =>
                      setNewTournament({
                        ...newTournament,
                        name: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    placeholder="Enter tournament name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newTournament.date}
                    onChange={(e) =>
                      setNewTournament({
                        ...newTournament,
                        date: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    value={newTournament.maxParticipants}
                    onChange={(e) =>
                      setNewTournament({
                        ...newTournament,
                        maxParticipants: parseInt(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    min="2"
                    max="64"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prize
                  </label>
                  <input
                    type="text"
                    value={newTournament.prize}
                    onChange={(e) =>
                      setNewTournament({
                        ...newTournament,
                        prize: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    placeholder="e.g., $500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={
                    editingTournament
                      ? handleUpdateTournament
                      : handleCreateTournament
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold"
                >
                  {editingTournament ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tournaments Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Loading tournaments...
            </h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                      {tournament.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        tournament.status
                      )}`}
                    >
                      {tournament.status.charAt(0).toUpperCase() +
                        tournament.status.slice(1)}
                    </span>
                    {isManager && (
                      <button
                        onClick={() => handleDeleteTournament(tournament.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                        title="Delete tournament"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">📅</span>
                    <span>
                      {new Date(tournament.date).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">👥</span>
                    <span>
                      {tournament.participants}/{tournament.maxParticipants}{" "}
                      participants
                    </span>
                  </div>

                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">🏆</span>
                    <span>Prize: {tournament.prize}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                    <div className="text-sm text-gray-500">
                      {tournament.status === "ongoing" && (
                        <span className="flex items-center">
                          <span className="mr-1">⏱️</span>
                          In Progress
                        </span>
                      )}
                    </div>
                    {isManager && (
                      <button
                        onClick={() => handleEditTournament(tournament)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-bold py-2 px-3 rounded hover:bg-blue-50 transition-colors w-full sm:w-auto"
                      >
                        Edit Tournament
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && tournaments.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tournaments yet
            </h3>
            <p className="text-gray-600">
              Create your first tournament to get started
            </p>
          </div>
        )}

        {/* Login Modal */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </div>
    </div>
  );
};

export default TournamentPage;
