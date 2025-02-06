### **1. Functional Requirements**
#### **Core Features:**
1. **Account Management**:
   2. User registration and login.
   3. Assign a unique email address to each user for forwarding content.

2. **Email Handling**:
   2. Receive and parse incoming emails via a unique email address.
   3. Extract email content (e.g., body, attachments).
   4. Handle routing based on recipient.

3. **Content Conversion**:
4. Send the content to a LLM to summarise with this prompt:
	\\#\### 
	You are a Blinkits editor tasked with creating a concise summary of the following content. Your goal is to distill the main ideas into a brief, engaging format that captures the essence of the material. Here's the content you need to summarize:

	<content>
	{{CONTENT}}
	</content>

	To create an effective Blinkit summary, follow these steps:

	1. Create an introduction:
		   2. Craft a brief, attention-grabbing opening sentence that encapsulates the main topic or theme of the content.
		   3. Provide context for the reader, explaining why this information is relevant or important.
		   4. Keep the introduction to 2-3 sentences maximum.

		1. Extract key points:
		   2. Identify the most important ideas, facts, or arguments from the content.
		   3. Aim for 3-5 key points, depending on the complexity and length of the original content.
		   4. Present each key point as a concise bullet point, using clear and straightforward language.
		   5. Ensure that each point can stand alone and be easily understood.

		1. Craft an ending:
		   2. Summarize the main takeaway or conclusion from the content in 1-2 sentences.
		   3. If applicable, include a brief statement on the implications or significance of the information presented.

		Format your Blinkit summary as follows:
		\<blinkit\_summary\>
		<intro>
		[Your introduction here]
		</intro>

		\<key\_points\>
		• [Key point 1]
		• [Key point 2]
		• [Key point 3]
		[Add more bullet points if necessary]
		\</key\_points\>

		<ending>
		[Your ending here]
		</ending>
		\</blinkit\_summary\>

		Remember to use clear, concise language throughout your summary. Avoid jargon or complex terminology unless absolutely necessary. Your goal is to make the information accessible and easy to understand for a general audience.
		\\#\#### 
5. store the summary in the same database row as the source 
   6. Use a TTS engine to convert email or article text into audio files.
   7. Offer options for full content, summaries, or specific time-limited formats (e.g., 2-minute summaries).

4. **Content Organization**:
   2. Automatically group audio files into playlists by topic, author, or user-defined categories.
   3. Provide tagging and filtering options for better organization.

5. **Playback Integration**:
   2. Generate personalized RSS feeds for users.
   3. Ensure compatibility with major podcast apps (e.g., Spotify, Apple Podcasts, Overcast).

6. **Browser and App Extensions**:
   2. Allow users to save articles via a browser extension or app integration.

7. **User Dashboard**:
   2. Display saved articles, generated audio, and playlists.
   3. Enable actions like playing, downloading, or deleting content.

8. **Notifications**:
   2. Notify users when new content is available in their feed.

---

### **3. Technical Requirements**
#### **Backend**:
- **Email Handling**: Use Mailgun or Amazon SES for receiving emails and routing them to the app.
- **TTS Conversion**: Integrate with OpenAI or Google Cloud TTS for generating natural-sounding audio.
- **Storage**:
  - Store raw email content and processed audio files in a scalable cloud storage solution (e.g., AWS S3, Google Cloud Storage).
- **Database**:
  - Use a relational database (e.g., PostgreSQL via Supabase) to manage user accounts, content metadata, and playlists.

#### **Frontend**:
- **Framework**: React with Next.js for building a responsive web interface.
- **Styling**: Tailwind CSS for modern, accessible design.

#### **API**:
- Develop RESTful APIs for:
  - Email processing.
  - Content conversion and playlist management.
  - RSS feed generation.

#### **RSS Feed**:
- Dynamically generate and update personalized RSS feeds for users.

#### **Security**:
- Encrypt user data in transit (HTTPS) and at rest.
- Ensure compliance with privacy standards (e.g., GDPR, CCPA).

---

### **4. Usability Requirements**
1. **Ease of Use**:
   2. Simple and intuitive UI for managing content and playlists.
   3. Clear instructions for using features like email forwarding and browser extensions.

2. **Accessibility**:
   2. Adhere to WCAG standards to ensure accessibility for all users.
   3. Provide adjustable playback speed for audio files.

3. **Cross-Platform Compatibility**:
   2. Support major browsers, mobile devices, and integration with podcast apps.

4. **Performance**:
   2. Ensure fast content processing and minimal delay in audio generation.
   3. Provide seamless playback with auto-queue functionality.

5. **Customization**:
   2. Allow users to customize summaries, playlist categories, and notification preferences.

6. **Reliability**:
   2. Provide fail-safes for incomplete or invalid content.
   3. Notify users if an email or article couldn’t be processed.

Tech stack, I want to use react, OpenAI api, shadcn/ui, tailwind. Supabase, mailgun. 

The UI should be of a typical audio interface, cards the audio and text
