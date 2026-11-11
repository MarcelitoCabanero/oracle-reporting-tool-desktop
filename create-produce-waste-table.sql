USE [CheckPostingDB]
GO

/****** Object:  Table [dbo].[dts_produce]    Script Date: 11/7/2026 1:27:41 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[dts_produce](
	[time_mixing] [varchar](50) NOT NULL,
	[date_mix] [date] NOT NULL,
	[shell_qty] [int] NOT NULL,
	[ring_qty] [int] NOT NULL,
	[jpops_qty] [int] NOT NULL,
	[Remarks] [varchar](50) NULL,
	[locationname] [varchar](50) NULL,
	[businessdate] [date] NOT NULL,
	[created_at] [datetime] NULL,
	[produce_id] [int] IDENTITY(1,1) NOT NULL,
	[sync_id] [uniqueidentifier] NULL,
	[headq_synced_at] [datetime2](7) NULL,
	[headq_sync_error] [nvarchar](1000) NULL,
 CONSTRAINT [PK_dts_produce] PRIMARY KEY CLUSTERED 
(
	[produce_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[dts_produce] ADD  CONSTRAINT [DF_pos_dts_produce_sync_id]  DEFAULT (newid()) FOR [sync_id]
GO


USE [CheckPostingDB]
GO

/****** Object:  Table [dbo].[dts_waste]    Script Date: 11/7/2026 1:28:09 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[dts_waste](
	[time_waste] [varchar](50) NOT NULL,
	[date_waste] [date] NOT NULL,
	[shell_qty] [int] NOT NULL,
	[ring_qty] [int] NOT NULL,
	[jpops_qty] [int] NOT NULL,
	[Remarks] [varchar](50) NULL,
	[locationname] [varchar](50) NULL,
	[businessdate] [date] NOT NULL,
	[created_at] [datetime] NULL,
	[waste_id] [int] IDENTITY(1,1) NOT NULL,
	[sync_id] [uniqueidentifier] NULL,
	[headq_synced_at] [datetime2](7) NULL,
	[headq_sync_error] [nvarchar](1000) NULL,
 CONSTRAINT [PK_dts_waste] PRIMARY KEY CLUSTERED 
(
	[waste_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
 CONSTRAINT [UQ_dts_waste_time_date] UNIQUE NONCLUSTERED 
(
	[time_waste] ASC,
	[date_waste] ASC,
	[Remarks] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[dts_waste] ADD  CONSTRAINT [DF_pos_dts_waste_sync_id]  DEFAULT (newid()) FOR [sync_id]
GO


