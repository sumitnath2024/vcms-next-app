import React, { useState, useRef } from 'react';
import { 
  Users, Plus, Edit2, Trash2, ChevronDown, ChevronRight, BookOpen, 
  Coins, Clock, CalendarCheck, ClipboardList, Library, StickyNote,
  BookOpenText, Download, Upload 
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Sub-components
import SubjectManager from './SubjectManager';
import FeeManager from './FeeManager';
import RoutineManager from './RoutineManager';
import ExamManager from './ExamManager';       
import ExamScheduler from './ExamScheduler';
import BookManager from './BookManager';
import CopyManager from './CopyManager';
import SyllabusManager from './SyllabusManager';

const CollapsibleSection = ({ title, icon: Icon, count, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-100">
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
        className="w-full flex items-center justify-between p-3 bg-gray-50/50 hover:bg-gray-100 transition text-left"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wide">
          {Icon && <Icon className="h-4 w-4 text-blue-500" />}
          {title} {count !== undefined && <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[10px] ml-1">{count}</span>}
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
      </button>
      {isOpen && <div className="animate-in fade-in slide-in-from-top-1 duration-200 cursor-auto" onClick={(e) => e.stopPropagation()}>{children}</div>}
    </div>
  );
};

const ClassItem = ({ cls, teachers, onUpdate, onEdit, onDelete, allClasses }) => {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef(null);

  const updateField = (field, data) => onUpdate({ ...cls, [field]: data });

// --- MASTER CLASS EXPORT ---
  const handleExportClass = (e) => {
    e.stopPropagation();
    
    const workbook = XLSX.utils.book_new();

    // 1. Class Info (UPDATED to include Class Teacher UID)
    const infoData = [{ 
      'Class Name': cls.name, 
      'Class Teacher': cls.classTeacher || '', 
      'Class Teacher UID': cls.classTeacherUid || '', // Added UID here
      'Description': cls.description || '' 
    }];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(infoData), "Class Info");

    // 2. Exams
    const examsData = (cls.exams || []).map(ex => ({ 'Exam Name': ex.name, 'Description': ex.description }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(examsData), "Exams");

    // 3. Subjects
    const subjectsData = (cls.subjects || []).map(sub => {
      const row = { Index: sub.indexNo, Subject: sub.name, Teacher: sub.teacher, TeacherID: sub.teacherId, MarksType: sub.marksType };
      (cls.exams || []).forEach(ex => { row[ex.name] = sub.examMarks?.[ex.id] || ''; });
      return row;
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(subjectsData), "Subjects");

    // 4. Syllabus
    const syllabusData = (cls.syllabus || []).map(s => ({
      'Exam Name': (cls.exams || []).find(ex => ex.id === s.examId)?.name || '',
      'Subject': s.subjectName || s.subjectId,
      'Book': s.book || '',
      'Start Date': s.startDate || '', 'End Date': s.endDate || '',
      'Question Type': s.questionType || '', 'Topics': s.topics || ''
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(syllabusData), "Syllabus");

    // 5. Books
    const booksData = (cls.books || []).map(b => ({ 'Subject': b.subject, 'Book Name': b.name, 'Author': b.author, 'Publisher': b.publisher }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(booksData), "Books");

    // 6. Copies
    const copiesData = (cls.copies || []).map(c => ({ 'Subject': c.subject, 'Copy Name': c.name, 'Type': c.type, 'Description': c.description }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(copiesData), "Copies");

    // 7. Fees
    const feesData = (cls.fees || []).map(f => ({ 'Fee Title': f.title, 'Amount': f.amount, 'Applicable Months': f.selectedMonths?.join(', ') || '' }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(feesData), "Fees");

    // 8. Routine
    const routineData = (cls.routine || []).map(r => ({ 'Day': r.day, 'Start Time': r.startTime, 'End Time': r.endTime, 'Subject': r.subjectName, 'Teacher': r.teacherName,'TeacherID': r.teacherId || '' }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(routineData), "Routine");

    // 9. Exam Schedules
    const scheduleData = (cls.examSchedules || []).map(sch => ({
      'Exam Name': (cls.exams || []).find(ex => ex.id === sch.examId)?.name || '',
      'Subject': sch.subjectName, 'Date': sch.date, 'Start Time': sch.startTime, 'End Time': sch.endTime, 'Status': sch.status,
      'Allocations Data': JSON.stringify(sch.allocations || [])
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(scheduleData), "Exam Schedules");

    // Save File
    XLSX.writeFile(workbook, `${cls.name.replace(/\s+/g, '_')}_Backup.xlsx`);
  };

  // --- MASTER CLASS IMPORT ---
  const handleImportClass = (e) => {
    e.stopPropagation();
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm(`Importing this file will completely replace ALL data (Subjects, Syllabus, Routines, etc.) for ${cls.name}. Continue?`)) {
      e.target.value = ''; return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const getSheetData = (name) => wb.Sheets[name] ? XLSX.utils.sheet_to_json(wb.Sheets[name]) : [];

        // Parse Class Info to restore main class details (UPDATED)
        const classInfo = getSheetData("Class Info")[0] || {};
        const importedClassName = classInfo['Class Name'] || cls.name;
        const importedClassTeacher = classInfo['Class Teacher'] || cls.classTeacher;
        const importedClassTeacherUid = classInfo['Class Teacher UID'] || cls.classTeacherUid;
        const importedDescription = classInfo['Description'] || cls.description;

        // Generate mapping for Exams
        const importedExams = getSheetData("Exams").map(r => ({
          id: Math.random().toString(36).substr(2, 9),
          name: r['Exam Name'] || '',
          description: r['Description'] || ''
        }));
        
        const examNameMap = {};
        importedExams.forEach(ex => { examNameMap[ex.name] = ex.id; });

        // Reconstruct Subjects
        const importedSubjects = getSheetData("Subjects").map(row => {
          const examMarks = {};
          importedExams.forEach(ex => { if (row[ex.name] !== undefined) examMarks[ex.id] = row[ex.name]; });
          return {
            id: Math.random().toString(36).substr(2, 9),
            indexNo: row['Index']?.toString() || '',
            name: row['Subject'] || '', teacher: row['Teacher'] || '', teacherId: row['TeacherID']?.toString() || '',
            marksType: row['MarksType'] || 'Numeric', examMarks
          };
        });

        // Reconstruct Syllabus
        const importedSyllabus = getSheetData("Syllabus").map(row => ({
          id: Math.random().toString(36).substr(2, 9),
          examId: examNameMap[row['Exam Name']] || '',
          subjectName: row['Subject'] || '', book: row['Book'] || '',
          startDate: row['Start Date'] || '', endDate: row['End Date'] || '',
          questionType: row['Question Type'] || '', topics: row['Topics'] || ''
        }));

        // Reconstruct Exam Schedules
        const importedSchedules = getSheetData("Exam Schedules").map(row => {
          let parsedAllocations = [{ roomNo: '', rollNos: '' }];
          try { if (row['Allocations Data']) parsedAllocations = JSON.parse(row['Allocations Data']); } catch(e){}
          return {
            id: Math.random().toString(36).substr(2, 9),
            examId: examNameMap[row['Exam Name']] || '',
            subjectName: row['Subject'] || '', date: row['Date'] || '',
            startTime: row['Start Time'] || '', endTime: row['End Time'] || '',
            status: row['Status'] || 'HOLD', allocations: parsedAllocations
          };
        });

        // Simple Array Reconstructions
        const importedBooks = getSheetData("Books").map(r => ({ id: Math.random().toString(36).substr(2, 9), subject: r['Subject']||'', name: r['Book Name']||'', author: r['Author']||'', publisher: r['Publisher']||'' }));
        const importedCopies = getSheetData("Copies").map(r => ({ id: Math.random().toString(36).substr(2, 9), subject: r['Subject']||'', name: r['Copy Name']||'', type: r['Type']||'', description: r['Description']||'' }));
        const importedFees = getSheetData("Fees").map(r => ({ id: Math.random().toString(36).substr(2, 9), title: r['Fee Title']||'', amount: r['Amount']||'', selectedMonths: (r['Applicable Months']||'').split(',').map(m=>m.trim()).filter(Boolean) }));
		
        const importedRoutine = getSheetData("Routine").map(r => {
          const importedId = r['TeacherID']?.toString() || '';
          let tMatch = teachers.find(t => (t.id === importedId || t.uid === importedId));
          if (!tMatch) tMatch = teachers.find(t => t.name?.toLowerCase() === (r['Teacher']||'').toLowerCase());
          
          return { 
            id: Math.random().toString(36).substr(2, 9), 
            day: r['Day'] || 'Monday', 
            startTime: r['Start Time'] || '', 
            endTime: r['End Time'] || '', 
            subjectName: r['Subject'] || '', 
            teacherName: tMatch?.name || r['Teacher'] || '', 
            teacherId: tMatch?.id || tMatch?.uid || importedId 
          };
        });

        // Final Update Object (UPDATED to apply the basic class info too)
        onUpdate({
          ...cls,
          name: importedClassName,
          classTeacher: importedClassTeacher,
          classTeacherUid: importedClassTeacherUid,
          description: importedDescription,
          exams: importedExams,
          subjects: importedSubjects,
          syllabus: importedSyllabus,
          examSchedules: importedSchedules,
          books: importedBooks,
          copies: importedCopies,
          fees: importedFees,
          routine: importedRoutine
        });

        alert("Class data fully imported and restored!");
      } catch (error) {
        console.error("Master Import Error:", error);
        alert("Error parsing backup file. Please ensure it's a valid Class Export Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm hover:shadow-md transition-all">
      <div onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 group">
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronDown className="h-5 w-5 text-blue-500" /> : <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500" />}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800 text-lg leading-none">{cls.name}</span>
                <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">{cls.classTeacher || 'No Teacher'}</span>
            </div>
            {cls.description && <span className="text-xs text-gray-400 mt-1 font-medium">{cls.description}</span>}
          </div>
        </div>
        
        {/* ACTION BUTTONS (Edit, Delete, Master Import/Export) */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          
          <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleImportClass} onClick={(e) => e.stopPropagation()} className="hidden" />
          
          <button onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition" title="Restore Data from Excel">
            <Upload className="h-4 w-4" />
          </button>
          
          <button onClick={handleExportClass} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition" title="Backup All Data to Excel">
            <Download className="h-4 w-4" />
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1"></div>

          <button onClick={(e) => { e.stopPropagation(); onEdit(cls); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="Edit Class Details">
            <Edit2 className="h-4 w-4" />
          </button>
          
          <button onClick={(e) => { e.stopPropagation(); onDelete(cls.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete Entire Class">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="bg-white border-t border-gray-100">
          <CollapsibleSection title="Subjects" icon={BookOpen} count={cls.subjects?.length || 0}>
            <SubjectManager subjects={cls.subjects} onUpdateSubjects={(d) => updateField('subjects', d)} teachers={teachers} exams={cls.exams || []} />
          </CollapsibleSection>

          <CollapsibleSection title="Syllabus" icon={BookOpenText} count={cls.syllabus?.length || 0}>
             <SyllabusManager 
                syllabus={cls.syllabus || []} 
                onUpdateSyllabus={(d) => updateField('syllabus', d)} 
                subjects={cls.subjects || []}
                exams={cls.exams || []}
                allClasses={allClasses} 
                currentClassId={cls.id}
             />
          </CollapsibleSection>

          <CollapsibleSection title="Book List" icon={Library} count={cls.books?.length || 0}>
            <BookManager books={cls.books || []} subjects={cls.subjects || []} onUpdateBooks={(d) => updateField('books', d)} />
          </CollapsibleSection>

          <CollapsibleSection title="Copy List" icon={StickyNote} count={cls.copies?.length || 0}>
            <CopyManager copies={cls.copies || []} subjects={cls.subjects || []} onUpdateCopies={(d) => updateField('copies', d)} />
          </CollapsibleSection>

          <CollapsibleSection title="Fee Structure" icon={Coins} count={cls.fees?.length || 0}>
            <FeeManager fees={cls.fees || []} onUpdateFees={(d) => updateField('fees', d)} />
          </CollapsibleSection>

          <CollapsibleSection title="Class Routine" icon={Clock} count={cls.routine?.length || 0}>
            <RoutineManager routine={cls.routine || []} onUpdateRoutine={(d) => updateField('routine', d)} subjects={cls.subjects || []} teachers={teachers} />
          </CollapsibleSection>

          <CollapsibleSection title="Examinations" icon={ClipboardList} count={cls.exams?.length || 0}>
             <ExamManager exams={cls.exams || []} onUpdateExams={(d) => updateField('exams', d)} />
          </CollapsibleSection>

          <CollapsibleSection title="Exam Schedule" icon={CalendarCheck} count={cls.examSchedules?.length || 0}>
            <ExamScheduler availableExams={cls.exams || []} schedules={cls.examSchedules || []} onUpdateSchedules={(d) => updateField('examSchedules', d)} subjects={cls.subjects || []} />
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
};

const ClassManager = ({ classes = [], onUpdateClasses, teachers = [] }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  // Added classTeacherUid to the initial state
  const [formData, setFormData] = useState({ name: '', description: '', classTeacher: '', classTeacherUid: '' });
  const [copyFromId, setCopyFromId] = useState('');

  const handleSave = () => {
    if (!formData.name) return alert("Class Name required");
    let updatedClasses = [...classes];
    
    if (editingId) {
      updatedClasses = updatedClasses.map(c => c.id === editingId ? { ...c, ...formData } : c);
    } else {
      let newClass = { 
          id: Math.random().toString(36).substr(2, 9), 
          ...formData, 
          subjects: [], 
          fees: [], 
          routine: [], 
          exams: [], 
          examSchedules: [], 
          books: [], 
          copies: [],
          syllabus: []
      };
      
      if (copyFromId) {
        const source = classes.find(c => c.id === copyFromId);
        if (source) {
          
          // 1. Create new Exams FIRST and keep a map of old ID -> new ID
          const examIdMap = {};
          newClass.exams = (source.exams || []).map(e => {
            const newExamId = Math.random().toString(36).substr(2, 9);
            examIdMap[e.id] = newExamId; 
            return { ...e, id: newExamId };
          });

          // 2. Copy Subjects, updating the examMarks keys to the newly generated Exam IDs
          newClass.subjects = (source.subjects || []).map(sub => {
            const updatedExamMarks = {};
            if (sub.examMarks) {
              Object.keys(sub.examMarks).forEach(oldExamId => {
                const newExamId = examIdMap[oldExamId] || oldExamId;
                updatedExamMarks[newExamId] = sub.examMarks[oldExamId];
              });
            }
            return { ...sub, id: Math.random().toString(36).substr(2, 9), examMarks: updatedExamMarks };
          });

          // 3. Copy simple arrays with new IDs
          newClass.fees = (source.fees || []).map(i => ({ ...i, id: Math.random().toString(36).substr(2, 9) }));
          newClass.books = (source.books || []).map(i => ({ ...i, id: Math.random().toString(36).substr(2, 9) }));
          newClass.copies = (source.copies || []).map(i => ({ ...i, id: Math.random().toString(36).substr(2, 9) }));
          newClass.routine = (source.routine || []).map(i => ({ ...i, id: Math.random().toString(36).substr(2, 9) }));

          // 4. Copy Exam Schedules & Syllabus using the new Exam IDs map
          newClass.examSchedules = (source.examSchedules || []).map(es => ({
             ...es, id: Math.random().toString(36).substr(2, 9), examId: examIdMap[es.examId] || es.examId
          }));

          newClass.syllabus = (source.syllabus || []).map(s => ({
             ...s, id: Math.random().toString(36).substr(2, 9), examId: examIdMap[s.examId] || s.examId
          }));
        }
      }
      updatedClasses.push(newClass);
    }
    
    onUpdateClasses(updatedClasses);
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <div className="p-4 border-t border-gray-100 bg-white">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" /> Classes Directory ({classes.length})
        </h4>
        {/* Reset form data including the new UID field */}
        <button onClick={() => { setFormData({ name: '', description: '', classTeacher: '', classTeacherUid: '' }); setCopyFromId(''); setEditingId(null); setShowForm(true); }} className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-md flex items-center gap-2 transition">
          <Plus className="h-4 w-4" /> Add Class
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-blue-200 shadow-sm animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <input type="text" placeholder="Class Name (e.g. Nursery Sec-A)" className="p-2 border rounded text-sm w-full bg-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            
            {/* CHANGED: Replaced free-text input with a Dropdown that captures both Name and UID */}
            <select 
              className={`p-2 border rounded text-sm w-full bg-white font-medium ${!formData.classTeacherUid ? 'text-gray-400' : 'text-gray-700'}`}
              value={formData.classTeacherUid || ''} 
              onChange={e => {
                const uid = e.target.value;
                const teacher = teachers.find(t => (t.uid === uid || t.id === uid));
                setFormData({
                  ...formData, 
                  classTeacherUid: uid,
                  classTeacher: teacher ? teacher.name : ''
                });
              }}
            >
              <option value="">-- Select Class Teacher --</option>
              {teachers.map(t => (
                <option key={t.uid || t.id} value={t.uid || t.id}>{t.name}</option>
              ))}
            </select>

            <input type="text" placeholder="Short Description" className="p-2 border rounded text-sm w-full bg-white" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            
            {!editingId && classes.length > 0 && (
              <select className="p-2 border rounded text-sm w-full bg-white text-gray-600 font-medium" value={copyFromId} onChange={(e) => setCopyFromId(e.target.value)}>
                <option value="">-- Copy Structure From --</option>
                {classes.map(cls => <option key={cls.id} value={cls.id}>Copy from: {cls.name}</option>)}
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="text-xs bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-bold">{editingId ? 'Update Class' : 'Create Class'}</button>
            <button onClick={() => setShowForm(false)} className="text-xs bg-white border px-4 py-2 rounded hover:bg-gray-50 transition">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {classes.length > 0 ? (
          classes.map(cls => (
            <ClassItem 
              key={cls.id} 
              cls={cls} 
              teachers={teachers} 
              allClasses={classes} 
              onUpdate={(d) => onUpdateClasses(classes.map(c => c.id === d.id ? d : c))} 
              onEdit={(c) => { 
                // Fallback: If editing an old class that has a name but no UID, try to auto-match the UID
                let matchedUid = c.classTeacherUid;
                if (!matchedUid && c.classTeacher) {
                  const match = teachers.find(t => t.name === c.classTeacher);
                  if (match) matchedUid = match.uid || match.id;
                }
                setFormData({ ...c, classTeacherUid: matchedUid || '' }); 
                setEditingId(c.id); 
                setShowForm(true); 
              }} 
              onDelete={(id) => { if(window.confirm("Are you sure you want to delete this entire class? This cannot be undone.")) onUpdateClasses(classes.filter(c => c.id !== id)) }} 
            />
          ))
        ) : (
          <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-500">No classes configured yet.</p>
            <p className="text-xs text-gray-400 mt-1">Click "Add Class" to start building your academic structure.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassManager;