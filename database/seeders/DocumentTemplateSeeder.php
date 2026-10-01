<?php

namespace Database\Seeders;

use App\Models\DocumentTemplate;
use App\Models\Program;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class DocumentTemplateSeeder extends Seeder
{
    /**
     * Seed official requirement templates for academic programs,
     * including storing realistic PDF template files on disk.
     */
    public function run(): void
    {
        $ojtUser = User::where('email', 'ojt.it@dtr.test')->first()
            ?? User::where('role', User::ROLE_SUPER_ADMIN)->first();

        $programs = Program::whereIn('program_name', ['BSIT-BTM', 'BSIT-IS', 'BSCS'])->get();

        if ($programs->isEmpty() || ! $ojtUser) {
            return;
        }

        $templates = [
            [
                'document_type' => 'parents_consent',
                'name' => "Parent's / Guardian's Consent Form",
                'category' => 'Pre Deployment',
                'description' => 'Signed consent from parent or guardian allowing you to proceed with the internship deployment.',
                'required' => true,
                'is_custom' => false,
                'instructions' => 'Please have your parent or legal guardian print, sign, and date this form. Attach a photocopy of a valid government ID.',
            ],
            [
                'document_type' => 'usep_hte_nda',
                'name' => 'USeP - Host Training Establishment NDA',
                'category' => 'Pre Deployment',
                'description' => 'Non-Disclosure Agreement between USeP and the Host Training Establishment.',
                'required' => true,
                'is_custom' => false,
                'instructions' => 'Must be reviewed and counter-signed by the company HR or your designated industry supervisor.',
            ],
            [
                'document_type' => 'pre_deployment_cert',
                'name' => 'Pre-Deployment Orientation Certificate',
                'category' => 'Pre Deployment',
                'description' => 'Certificate of completion for the mandatory pre-deployment enrollment orientation.',
                'required' => true,
                'is_custom' => false,
                'instructions' => 'Issued upon attending the CIC college pre-internship briefing.',
            ],
            [
                'document_type' => 'waiver_of_claim',
                'name' => 'Student Waiver of Claim and Liability',
                'category' => 'Pre Deployment',
                'description' => 'Signed waiver releasing USeP from liability during the internship deployment period.',
                'required' => true,
                'is_custom' => false,
                'instructions' => 'Must be notarized before submitting to the OJT coordinator.',
            ],
            [
                'document_type' => 'dtr',
                'name' => 'Monthly Daily Time Record (DTR) Form',
                'category' => 'During Deployment',
                'description' => 'Official monthly summary of daily hours rendered and certified by your supervisor.',
                'required' => true,
                'is_custom' => false,
                'instructions' => 'Download monthly from your intern portal, have supervisor sign, and upload here.',
            ],
            [
                'document_type' => 'weekly_progress_report',
                'name' => 'Weekly Accomplishment & Progress Report',
                'category' => 'During Deployment',
                'description' => 'Weekly summary report of tasks accomplished, skills acquired, and hours rendered.',
                'required' => true,
                'is_custom' => false,
                'instructions' => 'Compile your weekly journal entries and attach screenshots/photos if applicable.',
            ],
            [
                'document_type' => 'competency_tech_support',
                'name' => 'Assessment of Competency - Technical Support',
                'category' => 'During Deployment',
                'description' => 'Competency assessment form evaluating technical support and troubleshooting skills.',
                'required' => true,
                'is_custom' => false,
                'instructions' => 'To be completed by your industry mentor halfway through deployment.',
            ],
            [
                'document_type' => 'hte_evaluation_1',
                'name' => 'HTE Final Evaluation & Certificate of Completion',
                'category' => 'Evaluation Forms',
                'description' => 'Final evaluation form combined with the official Certificate of Completion issued by the company.',
                'required' => true,
                'is_custom' => false,
                'instructions' => 'Completed and signed by your HTE supervisor upon rendering 100% of required hours.',
            ],
            [
                'document_type' => 'company_safety_policy',
                'name' => 'Company Safety & Data Privacy Acknowledgement',
                'category' => 'Pre Deployment',
                'description' => 'Acknowledgement form covering workplace safety protocols and proprietary information security.',
                'required' => false,
                'is_custom' => true,
                'instructions' => 'Read and sign the company confidentiality and cybersecurity policy.',
            ],
        ];

        foreach ($programs as $program) {
            foreach ($templates as $item) {
                $filename = "{$item['document_type']}_template.pdf";
                $storagePath = "document-templates/{$program->program_id}_{$filename}";

                $pdfContent = $this->generatePdf(
                    title: "{$program->program_name} - {$item['name']}",
                    details: $item['description']
                );

                Storage::disk('local')->put($storagePath, $pdfContent);

                DocumentTemplate::updateOrCreate(
                    [
                        'program_id' => $program->program_id,
                        'document_type' => $item['document_type'],
                    ],
                    [
                        'name' => $item['name'],
                        'category' => $item['category'],
                        'description' => $item['description'],
                        'required' => $item['required'],
                        'is_custom' => $item['is_custom'],
                        'original_filename' => $filename,
                        'file_path' => $storagePath,
                        'file_size_bytes' => strlen($pdfContent),
                        'mime_type' => 'application/pdf',
                        'uploaded_by' => $ojtUser->id,
                        'instructions' => $item['instructions'],
                    ]
                );
            }
        }
    }

    private function generatePdf(string $title, string $details): string
    {
        $content = "BT /F1 16 Tf 50 720 Td (" . addcslashes($title, "()\\") . ") Tj ET\n"
                 . "BT /F1 11 Tf 50 680 Td (" . addcslashes($details, "()\\") . ") Tj ET\n"
                 . "BT /F1 9 Tf 50 650 Td (Official Blank Template - University of Southeastern Philippines) Tj ET";
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
