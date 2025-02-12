```mermaid
sequenceDiagram
    participant U as User
    participant ST as Stripe
    participant WH as Webhook Handler
    participant DB as Prisma DB
    participant PS as PaymentSuccessView
    participant OS as OnboardingStore

    Note over U,ST: Payment completed in Stripe Checkout

    ST->>WH: Send invoice.paid webhook
    
    WH->>DB: Find OrganizationOnboarding record
    
    alt Organization Found
        WH->>DB: Create Organization
        Note over WH: Using OrganizationRepository
        
        WH->>DB: Create Teams
        Note over WH: For each team in onboarding data
        
        WH->>DB: Create Member Invites
        Note over WH: For each invited member
        
        WH->>DB: Update onboarding record
        Note over WH: Mark as completed & link org
    end
    
    ST->>U: Redirect to success URL
    Note over U: /settings/organizations/new/success
    
    U->>PS: Load PaymentSuccessView
    PS->>OS: Get organization data
    
    loop Every 2 seconds
        PS->>DB: Poll for organization creation
        alt Organization Created
            PS->>U: Redirect to org settings
            Note over U: /settings/organizations/{id}/about
        end
    end
```


Flow 
- Org Creator's stripeCustomerId is lookedup in DB and reused if found, otherwise it is created in stripe and stored in DB and then used.
- stripeCustomerId uniquely identifies OrganizationOnboarding record.


Admin flow
- Admin lands on onboarding, has the option to set any email address(non-existing, existing) as the owner of the organization. He changes seats/pricePerSeat if needed.
- As he clicks the CTA, he impersonates the user. Impersonation is necessary so that in followup steps, teams are fetched for the user and also the OrganizationOnboarding records the impersonated user's email which then becomes the owner of the organization
  - If the user is non-existing, we create the user first and then impersonate(We could move this implementation to follow-up)
    - But as org isn't created yet, the user is created outside the organization and then on payment confirmation, we move the user to the organization.