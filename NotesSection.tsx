import { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { StudyMaterial } from '../../types';
import { FileType, Loader2, ChevronDown, ChevronUp, Search, Printer, BrainCircuit, X } from 'lucide-react';
import { recordRecentView } from '../../lib/tracking';
import Markdown from 'react-markdown';

export default function NotesSection({ user, selectedClass, selectedSubject }: { user?: User, selectedClass: string, selectedSubject: string }) {
  const [notes, setNotes] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [quizNote, setQuizNote] = useState<StudyMaterial | null>(null);
  const [quizContent, setQuizContent] = useState<string>('');
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'StudyMaterials'),
      where('type', '==', 'Note')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyMaterial));
      const results = allDocs.filter(doc => doc.class === selectedClass && doc.subject === selectedSubject);
      results.sort((a, b) => b.uploadDate - a.uploadDate);
      setNotes(results);
      setLoading(false);
    }, (error) => {
      console.warn("Error fetching notes:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedClass, selectedSubject]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const lowerQuery = searchQuery.toLowerCase();
    return notes.filter(note => 
      note.title.toLowerCase().includes(lowerQuery) || 
      (note.content && note.content.toLowerCase().includes(lowerQuery))
    );
  }, [notes, searchQuery]);

  const handleGenerateQuiz = async (note: StudyMaterial, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuizNote(note);
    setQuizContent('');
    setGeneratingQuiz(true);

    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteContent: note.content,
          title: note.title
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }
      
      setQuizContent(data.quiz);
    } catch (error: any) {
      console.error(error);
      setQuizContent('Error generating quiz. Please try again.');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handlePrintNote = (note: StudyMaterial, e: React.MouseEvent) => {
    e.stopPropagation();
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${note.title} - Print</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; color: #1e293b; }
              h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; margin-bottom: 0.5rem; }
              .meta { color: #64748b; font-size: 0.875rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #f1f5f9; }
              .content { white-space: pre-wrap; font-size: 1rem; }
            </style>
          </head>
          <body>
            <h1>${note.title}</h1>
            <div class="meta">Subject: ${note.subject} | Class: ${note.class} | Date: ${new Date(note.uploadDate).toLocaleDateString()}</div>
            <div class="content">${note.content}</div>
            <script>
              window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          Chapter Notes <span className="text-slate-400 text-lg font-medium ml-2">({selectedClass} • {selectedSubject})</span>
        </h2>

        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
            placeholder="Search Notes by title or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
          <FileType className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-lg text-slate-600 dark:text-slate-300 font-medium">
             {searchQuery ? "No Notes found matching your search." : "No Notes available for this subject yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note) => (
            <div key={note.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all">
              <button 
                onClick={() => {
                  const isExpanding = expandedId !== note.id;
                  setExpandedId(isExpanding ? note.id : null);
                  if (isExpanding && user) {
                    recordRecentView(user.uid, note);
                  }
                }}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">{note.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Uploaded: {new Date(note.uploadDate).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={(e) => handleGenerateQuiz(note, e)}
                    className="p-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/40 text-emerald-600 dark:text-emerald-400 rounded-full transition-colors flex items-center gap-1.5 text-sm font-medium px-3"
                    title="Generate Practice Quiz"
                  >
                    <BrainCircuit className="w-4 h-4" />
                    <span className="hidden sm:inline">Quiz</span>
                  </button>
                  <button 
                    onClick={(e) => handlePrintNote(note, e)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-full transition-colors"
                    title="Print Note"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <div className={`p-2 rounded-full ${expandedId === note.id ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    {expandedId === note.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </button>
              
              {expandedId === note.id && (
                <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <div className="prose prose-slate dark:prose-invert max-w-none mt-4 whitespace-pre-wrap font-sans">
                    {note.content}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quiz Modal */}
      {quizNote && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-emerald-600" />
                Practice Quiz: {quizNote.title}
              </h3>
              <button 
                onClick={() => {
                  setQuizNote(null);
                  setQuizContent('');
                }}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {generatingQuiz ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
                  <p className="font-medium text-slate-700 dark:text-slate-300 mb-2">Generating your practice quiz...</p>
                  <p className="text-sm">Creating 5 customized multiple-choice questions from this note.</p>
                </div>
              ) : (
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <Markdown>{quizContent}</Markdown>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end">
              <button
                onClick={() => {
                  setQuizNote(null);
                  setQuizContent('');
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
