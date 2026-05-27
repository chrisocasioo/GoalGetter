import React from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";

export default function Privacy() {
  return (
    <Layout>
      <article className="prose prose-slate dark:prose-invert prose-headings:font-serif prose-headings:font-normal prose-h1:text-5xl prose-h2:text-3xl prose-h2:mt-12 prose-a:text-primary hover:prose-a:text-primary/80 prose-a:no-underline max-w-none animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="mb-16 not-prose text-center">
          <h1 className="text-5xl md:text-6xl mb-6 text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground uppercase tracking-widest text-sm font-medium">Last updated: May 2026</p>
        </header>

        <h2>1. Introduction</h2>
        <p>
          GoalGetter ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services.
        </p>

        <h2>2. Information We Collect</h2>
        <p>We collect the following information to provide and improve our services:</p>
        <ul>
          <li><strong>Account Information:</strong> Email address used to create your account.</li>
          <li><strong>User Content:</strong> Goals and AI-generated plans you create within the app.</li>
          <li><strong>App Usage:</strong> Usage count and subscription status.</li>
          <li><strong>Technical Data:</strong> Device type and OS version for analytics.</li>
          <li><strong>Referral Data:</strong> Referral codes used during sign-up.</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>The information we collect is used in the following ways:</p>
        <ul>
          <li>To provide and improve the service.</li>
          <li>To generate AI-powered plans from your goals.</li>
          <li>To manage your subscription and billing.</li>
          <li>To send transactional emails (such as account updates and subscription notices).</li>
        </ul>
        <p><strong>We never sell your data to third parties, nor do we use it for advertising.</strong></p>

        <h2>4. Third-Party Services</h2>
        <p>We use trusted third-party service providers to power GoalGetter. Each service has its own privacy policy:</p>
        <ul>
          <li><strong>Clerk:</strong> Provides authentication. Stores your email and manages login sessions.</li>
          <li><strong>RevenueCat:</strong> Manages subscriptions. Processes and tracks in-app purchases.</li>
          <li><strong>OpenAI:</strong> Powers AI plan generation. Your goal text is sent to generate plans. <em>Please do not include sensitive personal information in your goals.</em></li>
        </ul>

        <h2>5. Data Storage and Security</h2>
        <p>
          Your data is stored securely on servers located in the United States. We use industry-standard encryption in transit (TLS) and at rest. Access to your data is strictly restricted to authorised personnel only.
        </p>

        <h2>6. Data Retention</h2>
        <p>
          We retain your data for as long as your account is active. You can delete your account at any time from the app's Profile screen. Initiating account deletion permanently removes all your data from our systems within 30 days.
        </p>

        <h2>7. Your Rights (GDPR & CCPA)</h2>
        <p>Depending on your location, you may have specific rights regarding your personal data:</p>
        <ul>
          <li>The right to access, correct, or delete your personal data.</li>
          <li>The right to data portability.</li>
          <li>The right to opt out of the sale of personal information (Note: we do not sell your data).</li>
        </ul>
        <p>
          <strong>GDPR users:</strong> You have the right to lodge a complaint with your national supervisory authority.
        </p>
        <p>
          <strong>CCPA users:</strong> You may contact us to exercise your California privacy rights.
        </p>

        <h2>8. Children's Privacy</h2>
        <p>
          GoalGetter is not intended for use by children under the age of 13. We do not knowingly collect personal data from children. If we become aware that we have collected data from a child under 13, we will take steps to delete that information.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify users of any material changes via an in-app notice or by email.
        </p>

        <h2>10. Contact</h2>
        <p>
          For any privacy questions or to exercise your rights, please contact us at:<br/>
          <a href="mailto:privacy@goalgetter.app" className="font-medium text-primary">privacy@goalgetter.app</a>
        </p>

        <hr className="my-12 border-border/50" />
        
        <div className="not-prose text-center">
          <p className="text-muted-foreground mb-4">Also review our rules and guidelines.</p>
          <Link href="/terms" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors">
            Read the Terms of Service <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </article>
    </Layout>
  );
}
