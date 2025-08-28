import { createClient } from '@/lib/supabase/server'
import { StudentForm } from '@/components/client/StudentForm'

interface FamilyInfoProps {
  familyId: string
}

export async function FamilyInfo({ familyId }: FamilyInfoProps) {
  const supabase = createClient()
  
  // 家族内の生徒を取得
  const { data: students } = await supabase
    .from('profiles')
    .select('*')
    .eq('family_id', familyId)
    .eq('role', 'student')
    .order('created_at', { ascending: true })

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          家族構成
        </h2>
        
        {students && students.length > 0 ? (
          <div className="space-y-3">
            {students.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {student.last_name} {student.first_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    ログインID: <span className="font-mono">{student.login_id}</span>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  生徒
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            まだ生徒が登録されていません
          </p>
        )}

        <div className="mt-6">
          <StudentForm />
        </div>
      </div>
    </div>
  )
}