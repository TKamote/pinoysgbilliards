"use client";

import { useState } from "react";

interface Player {
  id: string;
  name: string;
  email: string;
  phone: string;
  skillLevel: "beginner" | "intermediate" | "advanced" | "expert";
  rating: number;
  tournamentsPlayed: number;
  wins: number;
  status: "active" | "inactive";
}

const PlayersPage = () => {
  const [players, setPlayers] = useState<Player[]>([
    {
      id: "1",
      name: "Juan Dela Cruz",
      email: "juan@email.com",
      phone: "+65 9123 4567",
      skillLevel: "advanced",
      rating: 4.5,
      tournamentsPlayed: 12,
      wins: 8,
      status: "active",
    },
    {
      id: "2",
      name: "Maria Santos",
      email: "maria@email.com",
      phone: "+65 9876 5432",
      skillLevel: "expert",
      rating: 4.8,
      tournamentsPlayed: 20,
      wins: 15,
      status: "active",
    },
    {
      id: "3",
      name: "Pedro Rodriguez",
      email: "pedro@email.com",
      phone: "+65 8765 4321",
      skillLevel: "intermediate",
      rating: 3.2,
      tournamentsPlayed: 5,
      wins: 2,
      status: "active",
    },
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    name: "",
    email: "",
    phone: "",
    skillLevel: "beginner" as
      | "beginner"
      | "intermediate"
      | "advanced"
      | "expert",
  });

  const handleCreatePlayer = () => {
    const player: Player = {
      id: Date.now().toString(),
      name: newPlayer.name,
      email: newPlayer.email,
      phone: newPlayer.phone,
      skillLevel: newPlayer.skillLevel,
      rating: 0,
      tournamentsPlayed: 0,
      wins: 0,
      status: "active",
    };

    setPlayers([...players, player]);
    setNewPlayer({ name: "", email: "", phone: "", skillLevel: "beginner" });
    setShowCreateForm(false);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-end items-center mb-6">
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            ➕ Add Player
          </button>
        </div>

        {/* Create Player Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add New Player</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Player Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Player Name
                  </label>
                  <input
                    type="text"
                    value={newPlayer.name}
                    onChange={(e) =>
                      setNewPlayer({ ...newPlayer, name: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter player name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ranking Points
                  </label>
                  <input
                    type="number"
                    placeholder="Enter points"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  onClick={handleCreatePlayer}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Add Player
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Players Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Players 1-32 */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Players 1-25
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-center text-base font-medium text-gray-500 uppercase tracking-wider w-16">
                      Rank
                    </th>
                    <th className="px-2 py-2 text-center text-base font-medium text-gray-500 uppercase tracking-wider w-16">
                      Photo
                    </th>
                    <th className="px-3 py-2 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                      Players Name
                    </th>
                    <th className="px-2 py-2 text-center text-base font-medium text-gray-500 uppercase tracking-wider w-20">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.from({ length: 25 }, (_, i) => (
                    <tr key={i + 1} className="hover:bg-gray-50">
                      <td className="px-2 py-2 text-center text-lg font-medium text-gray-900 w-16">
                        #{i + 1}
                      </td>
                      <td className="px-2 py-2 text-center w-16">
                        <div className="w-6 h-6 bg-linear-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-sm mx-auto">
                          👤
                        </div>
                      </td>
                      <td className="px-3 py-2 text-lg text-gray-900">
                        Player {i + 1}
                      </td>
                      <td className="px-2 py-2 text-center text-lg text-gray-900 w-20">
                        {100 + (i + 1) * 10}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Middle Column - Players 26-50 */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Players 26-50
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                      Photo
                    </th>
                    <th className="px-4 py-3 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.from({ length: 25 }, (_, i) => (
                    <tr key={i + 26} className="hover:bg-gray-50">
                      <td className="px-2 py-2 text-center text-lg font-medium text-gray-900 w-16">
                        #{i + 26}
                      </td>
                      <td className="px-2 py-2 text-center w-16">
                        <div className="w-6 h-6 bg-linear-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-sm mx-auto">
                          👤
                        </div>
                      </td>
                      <td className="px-3 py-2 text-lg text-gray-900">
                        Player {i + 26}
                      </td>
                      <td className="px-2 py-2 text-center text-lg text-gray-900 w-20">
                        {100 + (i + 1) * 10}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column - Players 51-75 */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Players 51-75
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-center text-base font-medium text-gray-500 uppercase tracking-wider w-16">
                      Rank
                    </th>
                    <th className="px-2 py-2 text-center text-base font-medium text-gray-500 uppercase tracking-wider w-16">
                      Photo
                    </th>
                    <th className="px-3 py-2 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                      Players Name
                    </th>
                    <th className="px-2 py-2 text-center text-base font-medium text-gray-500 uppercase tracking-wider w-20">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.from({ length: 25 }, (_, i) => (
                    <tr key={i + 51} className="hover:bg-gray-50">
                      <td className="px-2 py-2 text-center text-lg font-medium text-gray-900 w-16">
                        #{i + 51}
                      </td>
                      <td className="px-2 py-2 text-center w-16">
                        <div className="w-6 h-6 bg-linear-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-sm mx-auto">
                          👤
                        </div>
                      </td>
                      <td className="px-3 py-2 text-lg text-gray-900">
                        Player {i + 51}
                      </td>
                      <td className="px-2 py-2 text-center text-lg text-gray-900 w-20">
                        {100 + (i + 1) * 10}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayersPage;
