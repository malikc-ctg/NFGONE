import { createServiceClient, createClient } from '@/lib/supabase/server';
import { isValidTransition } from '@/lib/job-state-machine';
import { NextRequest, NextResponse } from 'next/server';
import type { JobStatus } from '@/types';
import { requireRole, requireAuth } from '@/lib/api-auth';
import { sendEmail } from '@/lib/resend';
import { logAudit } from '@/lib/audit';
import EmployeeAssigned from '@/emails/customer/EmployeeAssigned';
import JobAssigned from '@/emails/employee/JobAssigned';
import EmployeeEnRoute from '@/emails/customer/EmployeeEnRoute';
import ServiceStarted from '@/emails/customer/ServiceStarted';
import ServiceCompleted from '@/emails/customer/ServiceCompleted';
import ReviewRequest from '@/emails/customer/ReviewRequest';
import CustomerJobCancelled from '@/emails/customer/JobCancelled';
import EmployeeJobCancelled from '@/emails/employee/JobCancelled';
import React from 'react';
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  // Auth check
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

    const supabaseClient = await createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    // Get user role
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single();
    
    const isAdmin = profile?.role === 'admin';

    const supabase = await createServiceClient();
    const { id } = params;
    const { status: newStatus, ...extraFields } = await request.json();

    // Get current job
    const { data: job, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    let employeeId = null;
    if (user && !isAdmin) {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', user.id)
        .single();
      employeeId = employee?.id;
    }

    // Security Check: Only admin or the assigned employee can update this job
    if (!isAdmin && job.assigned_employee_id !== employeeId) {
      return NextResponse.json({ error: 'Unauthorized to update this job' }, { status: 403 });
    }

    // Validate transition
    if (!isValidTransition(job.status as JobStatus, newStatus as JobStatus)) {
      return NextResponse.json(
        { error: `Invalid status transition: ${job.status} → ${newStatus}` },
        { status: 422 }
      );
    }

    // Build update object
    const updateData: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Handle specific transitions
    if (newStatus === 'in_progress') {
      updateData.employee_started_at = new Date().toISOString();
    }
    if (newStatus === 'completed') {
      updateData.employee_completed_at = new Date().toISOString();
    }
    if (newStatus === 'cancelled' && extraFields.cancellation_reason) {
      updateData.cancellation_reason = extraFields.cancellation_reason;
    }
    if (newStatus === 'disputed' && extraFields.dispute_reason) {
      updateData.dispute_reason = extraFields.dispute_reason;
    }

    // Merge any additional allowed fields
    if (extraFields.final_price !== undefined) updateData.final_price = extraFields.final_price;
    if (extraFields.admin_notes !== undefined) updateData.admin_notes = extraFields.admin_notes;
    if (extraFields.assigned_employee_id !== undefined) {
      updateData.assigned_employee_id = extraFields.assigned_employee_id;
    }

    const { data, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', id)
      .select('*, customer:customers(*), employee:employees(*)')
      .single();

    if (error) throw error;

    // ----- AUDIT LOG -----
    logAudit({
      actorId: auth.id,
      actorEmail: auth.email,
      actorRole: isAdmin ? 'admin' : 'employee',
      action: 'job.status_changed',
      entityType: 'job',
      entityId: id,
      oldValues: { status: job.status },
      newValues: { status: newStatus },
      request,
      metadata: extraFields.cancellation_reason ? { cancellation_reason: extraFields.cancellation_reason } : undefined,
    });

    // ----- EMAIL DISPATCH LOGIC -----
    try {
      const custObj = Array.isArray(data.customer) ? data.customer[0] : data.customer;
      const contObj = Array.isArray(data.employee) ? data.employee[0] : data.employee;

      const cName = custObj?.full_name || 'Customer';
      const cEmail = custObj?.email;
      const contName = contObj?.full_name || 'Employee';
      const contEmail = contObj?.email;
      const date = data.scheduled_date || 'TBD';
      const time = data.scheduled_window || 'TBD';
      
      // 1. If a employee was just assigned
      if (extraFields.assigned_employee_id && job.assigned_employee_id !== extraFields.assigned_employee_id) {
         if (cEmail) {
           await sendEmail({
             to: cEmail,
             subject: `Your Cleaner is Set for ${date}`,
             react: React.createElement(EmployeeAssigned, { customerName: cName, date, timeWindow: time })
           });
         }
         if (contEmail) {
           await sendEmail({
             to: contEmail,
             subject: 'New Job Assigned',
             react: React.createElement(JobAssigned, {
               employeeName: contName,
               date,
               timeWindow: time,
               location: `${data.address_line1}, ${data.city}`,
               jobDetails: data.service_type || 'Standard Clean',
               dashboardLink: 'https://seaofblue.app/employee'
             })
           });
         }
      }

      // 2. If job status progressed
      if (newStatus && newStatus !== job.status) {
        if (newStatus === 'on_the_way' && cEmail) {
           await sendEmail({
             to: cEmail,
             subject: 'Your Cleaner is On the Way',
             react: React.createElement(EmployeeEnRoute, { customerName: cName, arrivalTime: 'shortly' })
           });
        } else if (newStatus === 'in_progress' && cEmail) {
           await sendEmail({
             to: cEmail,
             subject: 'Service Started',
             react: React.createElement(ServiceStarted, { customerName: cName, startTime: 'now' })
           });
         } else if (newStatus === 'completed' && cEmail) {
           await sendEmail({
             to: cEmail,
             subject: 'All Done!',
             react: React.createElement(ServiceCompleted, { customerName: cName, completionTime: 'now' })
           });
           await sendEmail({
             to: cEmail,
             subject: 'How did we do?',
             react: React.createElement(ReviewRequest, { customerName: cName, date, reviewLink: 'https://seaofblue.app/reviews' })
           });
         } else if (newStatus === 'cancelled') {
           // 3. Expire pending offers if the job is cancelled
           const serviceClient = await createServiceClient();
           await serviceClient.from('job_offers').update({ status: 'expired' }).eq('job_id', id).eq('status', 'pending');
           
           if (cEmail) {
             await sendEmail({
               to: cEmail,
               subject: `Booking Cancelled - ${date}`,
               react: React.createElement(CustomerJobCancelled, { customerName: cName, date })
             });
           }
           if (contEmail) {
             await sendEmail({
               to: contEmail,
               subject: `Job Cancelled - ${date}`,
               react: React.createElement(EmployeeJobCancelled, { employeeName: contName, date })
             });
           }
         }
      }
    } catch (emailError) {
      console.error('Failed to send status update emails:', emailError);
    }
    // --------------------------------

    // Refresh finance PnL if status changed to something that affects financials
    if (newStatus && newStatus !== job.status) {
      if (['completed', 'reviewed', 'paid_out', 'refunded', 'cancelled'].includes(newStatus)) {
        try {
          await supabase.rpc('refresh_zone_monthly_pnl');
        } catch (pnlError) {
          console.error('Failed to refresh PnL view:', pnlError);
        }
      }
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
