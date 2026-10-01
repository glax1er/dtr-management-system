<?php

namespace Database\Seeders;

use App\Models\InternDocument;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class InternDocumentSeeder extends Seeder
{
    /**
     * Seed submitted, approved, and rejected intern documents with real PDF files stored on disk.
     */
    public function run(): void
    {
        $alex = User::where('email', 'intern.alex@dtr.test')->first();
        $eduardo = User::where('email', 'intern.completed@dtr.test')->first();
        $fiona = User::where('email', 'intern.revision@dtr.test')->first();

        $ojtIt = User::where('email', 'ojt.it@dtr.test')->first() ?? User::where('role', User::ROLE_SUPERVISOR)->first();
        $ojtCs = User::where('email', 'ojt.cs@dtr.test')->first() ?? $ojtIt;

        // 1. Alex Rivera's Documents
        if ($alex && $ojtIt) {
            $alexDocs = [
                [
                    'type' => 'parents_consent',
                    'filename' => 'Rivera_Parents_Consent_Signed.pdf',
                    'status' => InternDocument::STATUS_APPROVED,
                    'submitted_at' => now()->subDays(35),
                    'reviewed_at' => now()->subDays(34),
                    'reviewed_by' => $ojtIt->id,
                    'rejection_reason' => null,
                ],
                [
                    'type' => 'usep_hte_nda',
                    'filename' => 'Rivera_Accenture_NDA_Signed.pdf',
                    'status' => InternDocument::STATUS_APPROVED,
                    'submitted_at' => now()->subDays(35),
                    'reviewed_at' => now()->subDays(34),
                    'reviewed_by' => $ojtIt->id,
                    'rejection_reason' => null,
                ],
                [
                    'type' => 'pre_deployment_cert',
                    'filename' => 'Rivera_Orientation_Certificate.pdf',
                    'status' => InternDocument::STATUS_APPROVED,
                    'submitted_at' => now()->subDays(35),
                    'reviewed_at' => now()->subDays(34),
                    'reviewed_by' => $ojtIt->id,
                    'rejection_reason' => null,
                ],
                [
                    'type' => 'waiver_of_claim',
                    'filename' => 'Rivera_Waiver_Notarized.pdf',
                    'status' => InternDocument::STATUS_APPROVED,
                    'submitted_at' => now()->subDays(35),
                    'reviewed_at' => now()->subDays(34),
                    'reviewed_by' => $ojtIt->id,
                    'rejection_reason' => null,
                ],
                [
                    'type' => 'dtr',
                    'filename' => 'Rivera_DTR_August_2026.pdf',
                    'status' => InternDocument::STATUS_PENDING,
                    'submitted_at' => now()->subDays(2),
                    'reviewed_at' => null,
                    'reviewed_by' => null,
                    'rejection_reason' => null,
                ],
                [
                    'type' => 'weekly_progress_report',
                    'filename' => 'Rivera_Weekly_Report_Week5.pdf',
                    'status' => InternDocument::STATUS_PENDING,
                    'submitted_at' => now()->subDay(),
                    'reviewed_at' => null,
                    'reviewed_by' => null,
                    'rejection_reason' => null,
                ],
            ];

            foreach ($alexDocs as $doc) {
                $this->createInternDoc($alex, $doc);
            }
        }

        // 2. Eduardo Ramos's Documents (100% Completed Intern)
        if ($eduardo && $ojtIt) {
            $eduardoTypes = [
                'parents_consent' => 'Ramos_Parents_Consent_Signed.pdf',
                'usep_hte_nda' => 'Ramos_NDA_Certified.pdf',
                'pre_deployment_cert' => 'Ramos_PreDeployment_Cert.pdf',
                'waiver_of_claim' => 'Ramos_Liability_Waiver.pdf',
                'dtr' => 'Ramos_Final_DTR_Record.pdf',
                'weekly_progress_report' => 'Ramos_Comprehensive_Weekly_Reports.pdf',
                'competency_tech_support' => 'Ramos_TechSupport_Evaluation.pdf',
                'hte_evaluation_1' => 'Ramos_HTE_Certificate_Of_Completion.pdf',
            ];

            foreach ($eduardoTypes as $type => $filename) {
                $this->createInternDoc($eduardo, [
                    'type' => $type,
                    'filename' => $filename,
                    'status' => InternDocument::STATUS_APPROVED,
                    'submitted_at' => now()->subDays(20),
                    'reviewed_at' => now()->subDays(18),
                    'reviewed_by' => $ojtIt->id,
                    'rejection_reason' => null,
                ]);
            }
        }

        // 3. Fiona Lim's Documents (Document Revision Required Intern)
        if ($fiona && $ojtCs) {
            $fionaDocs = [
                [
                    'type' => 'parents_consent',
                    'filename' => 'Lim_Parents_Consent_Draft.pdf',
                    'status' => InternDocument::STATUS_REJECTED,
                    'submitted_at' => now()->subDays(4),
                    'reviewed_at' => now()->subDays(2),
                    'reviewed_by' => $ojtCs->id,
                    'rejection_reason' => 'Missing parent/guardian signature on page 2. Please have your parent sign and re-upload.',
                ],
                [
                    'type' => 'usep_hte_nda',
                    'filename' => 'Lim_DICT_NDA_Signed.pdf',
                    'status' => InternDocument::STATUS_PENDING,
                    'submitted_at' => now()->subDays(1),
                    'reviewed_at' => null,
                    'reviewed_by' => null,
                    'rejection_reason' => null,
                ],
            ];

            foreach ($fionaDocs as $doc) {
                $this->createInternDoc($fiona, $doc);
            }
        }
    }

    /**
     * @param array{
     *     type: string,
     *     filename: string,
     *     status: string,
     *     submitted_at: \Carbon\CarbonInterface,
     *     reviewed_at: \Carbon\CarbonInterface|null,
     *     reviewed_by: int|null,
     *     rejection_reason: string|null
     * } $doc
     */
    private function createInternDoc(User $user, array $doc): void
    {
        $storagePath = "intern-documents/{$user->id}/{$doc['type']}.pdf";
        $pdfContent = $this->generatePdf(
            title: "{$user->name} - {$doc['filename']}",
            details: "Document Status: " . ucfirst(str_replace('_', ' ', $doc['status']))
        );

        Storage::disk('local')->put($storagePath, $pdfContent);

        InternDocument::updateOrCreate(
            [
                'user_id' => $user->id,
                'document_type' => $doc['type'],
            ],
            [
                'original_filename' => $doc['filename'],
                'file_path' => $storagePath,
                'file_size_bytes' => strlen($pdfContent),
                'mime_type' => 'application/pdf',
                'status' => $doc['status'],
                'rejection_reason' => $doc['rejection_reason'],
                'reviewed_by' => $doc['reviewed_by'],
                'reviewed_at' => $doc['reviewed_at'],
                'submitted_at' => $doc['submitted_at'],
            ]
        );
    }

    private function generatePdf(string $title, string $details): string
    {
        $content = "BT /F1 16 Tf 50 720 Td (" . addcslashes($title, "()\\") . ") Tj ET\n"
                 . "BT /F1 11 Tf 50 680 Td (" . addcslashes($details, "()\\") . ") Tj ET\n"
                 . "BT /F1 9 Tf 50 650 Td (Student Intern Submission Document - DTR System) Tj ET";
        $len = strlen($content);

        return "%PDF-1.4\n"
            . "1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
            . "2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n"
            . "3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R>> endobj\n"
            . "4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n"
            . "5 0 obj <</Length {$len}>>\nstream\n{$content}\nendstream\nendobj\n"
            . "xref\n0 6\n0000000000 65535 f \n"
            . "trailer <</Size 6 /Root 1 0 R>>\nstartxref\n500\n%%EOF";
    }
}
