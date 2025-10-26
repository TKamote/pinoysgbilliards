"use client";

import { useState } from "react";

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
  const [tournaments, setTournaments] = useState<Tournament[]>([
    {
      id: "1",
      name: "Weekly Championship",
      date: "2024-01-15",
      status: "ongoing",
      participants: 16,
      maxParticipants: 32,
      prize: "$500",
    },
    {
      id: "2",
      name: "Monthly Masters",
      date: "2024-01-20",
      status: "upcoming",
      participants: 8,
      maxParticipants: 16,
      prize: "$1000",
    },
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTournament, setNewTournament] = useState({
    name: "",
    date: "",
    maxParticipants: 16,
    prize: "",
  });

  const handleCreateTournament = () => {
    const tournament: Tournament = {
      id: Date.now().toString(),
      name: newTournament.name,
      date: newTournament.date,
      status: "upcoming",
      participants: 0,
      maxParticipants: newTournament.maxParticipants,
      prize: newTournament.prize,
    };

    setTournaments([...tournaments, tournament]);
    setNewTournament({ name: "", date: "", maxParticipants: 16, prize: "" });
    setShowCreateForm(false);
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
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🏆 Tournaments</h1>
            <p className="text-gray-600 mt-2">
              Manage your billiards tournaments
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            ➕ Create Tournament
          </button>
        </div>

        {/* Create Tournament Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Create New Tournament</h2>
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., $500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTournament}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tournaments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  {tournament.name}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    tournament.status
                  )}`}
                >
                  {tournament.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <span className="mr-2">📅</span>
                  <span>{new Date(tournament.date).toLocaleDateString()}</span>
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
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {tournament.status === "ongoing" && (
                      <span className="flex items-center">
                        <span className="mr-1">⏱️</span>
                        In Progress
                      </span>
                    )}
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {tournaments.length === 0 && (
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
      </div>
    </div>
  );
};

export default TournamentPage;
