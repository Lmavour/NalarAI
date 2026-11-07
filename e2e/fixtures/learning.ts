import type { DashboardData, LessonSessionDto } from "../../src/types/learning";

export const dashboardFixture: DashboardData = {
  user: {
    email: "maya.putri.pelajar-dengan-email-panjang@belajar.nalar.example",
    displayName: "Maya Putri",
    joinedAt: "2026-10-01T00:00:00.000Z",
  },
  stats: {
    xp: 124580,
    hearts: 5,
    streak: 28,
    longestStreak: 40,
    lessonsCompleted: 42,
    league: "Sapphire",
  },
  progress: {
    topic: "Fotosintesis dan hubungan antara ekosistem, cahaya, serta energi kimia",
    completedStageIds: ["foundation", "core-concept"],
    activityDates: ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"],
  },
};

export const lessonFixture: LessonSessionDto = {
  sessionId: "000000000000000000000001",
  stageId: "connections",
  title: "Menghubungkan fotosintesis dengan aliran energi dalam ekosistem",
  overview: "Pelajari bagaimana cahaya menjadi energi kimia dan berpindah melalui rantai makanan.",
  estimatedMinutes: 6,
  material: [
    {
      id: "material-1",
      title: "Dari cahaya matahari menjadi energi yang bisa digunakan tumbuhan",
      content: "Daun menangkap energi cahaya melalui klorofil. Energi ini membantu tumbuhan mengubah air dan karbon dioksida menjadi gula. Bayangkan daun sebagai dapur kecil: cahaya adalah sumber tenaga, air dan karbon dioksida adalah bahan, sedangkan gula adalah hasil masakannya.\n\nGula dapat dipakai untuk tumbuh atau disimpan. Saat tumbuhan dimakan, sebagian energi berpindah ke hewan. Hubungan ini menjelaskan mengapa cahaya mendukung kehidupan dalam banyak ekosistem.",
      keyTakeaway: "Fotosintesis mengubah energi cahaya menjadi energi kimia yang tersimpan di dalam gula.",
    },
    {
      id: "material-2",
      title: "Energi bergerak, materi berputar",
      content: "Energi berpindah dari produsen ke konsumen dan sebagian dilepas sebagai panas. Materi seperti air dan karbon dapat kembali ke lingkungan melalui proses kehidupan dan penguraian.",
      keyTakeaway: "Aliran energi berbeda dari siklus materi: energi tidak berputar dengan cara yang sama.",
    },
  ],
  questions: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      prompt: "Ketika tumbuhan melakukan fotosintesis, perubahan energi utama apa yang memungkinkan energi matahari kemudian digunakan oleh organisme lain dalam ekosistem?",
      options: [
        { id: "00000000-0000-4000-8000-000000000011", text: "Energi cahaya diubah menjadi energi kimia yang tersimpan dalam gula, lalu dapat berpindah melalui hubungan makan dan dimakan." },
        { id: "00000000-0000-4000-8000-000000000012", text: "Energi panas diubah menjadi cahaya yang disimpan permanen di dalam daun." },
        { id: "00000000-0000-4000-8000-000000000013", text: "Energi dari tanah diubah menjadi listrik sehingga hewan tidak membutuhkan makanan." },
        { id: "00000000-0000-4000-8000-000000000014", text: "Energi kimia diubah langsung menjadi suara untuk menarik organisme lain." },
      ],
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      prompt: "Apa perbedaan utama antara aliran energi dan siklus materi di dalam ekosistem?",
      options: [
        { id: "00000000-0000-4000-8000-000000000021", text: "Energi mengalir dan sebagian lepas sebagai panas, sedangkan materi dapat kembali digunakan melalui siklus." },
        { id: "00000000-0000-4000-8000-000000000022", text: "Energi dan materi sama-sama hilang permanen setelah dimakan konsumen." },
        { id: "00000000-0000-4000-8000-000000000023", text: "Materi hanya bergerak satu arah, sedangkan energi selalu berputar tanpa berkurang." },
        { id: "00000000-0000-4000-8000-000000000024", text: "Keduanya tidak memiliki hubungan dengan produsen dan konsumen." },
      ],
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      prompt: "Mengapa produsen menjadi titik awal penting bagi banyak rantai makanan?",
      options: [
        { id: "00000000-0000-4000-8000-000000000031", text: "Produsen memasukkan energi cahaya ke ekosistem sebagai energi kimia yang dapat dimakan organisme lain." },
        { id: "00000000-0000-4000-8000-000000000032", text: "Produsen menciptakan energi baru tanpa membutuhkan sumber energi apa pun." },
        { id: "00000000-0000-4000-8000-000000000033", text: "Produsen hanya menyimpan air sehingga konsumen tidak memerlukan energi." },
        { id: "00000000-0000-4000-8000-000000000034", text: "Produsen mengubah seluruh panas menjadi materi yang tidak dapat dimakan." },
      ],
    },
  ],
  expiresAt: "2099-01-01T00:00:00.000Z",
};
